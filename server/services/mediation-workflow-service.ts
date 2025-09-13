import { Pool } from 'pg';
import { MediationService } from './mediation-service';
import { AIMediationService } from './ai-mediation-service';
import { MediationCase, MediationStatus, MediationEvent } from '../types';
import { logger } from '../utils/logger';

interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  requiredActions: string[];
  completionCriteria: string[];
  estimatedDuration: string;
  nextSteps: string[];
}

interface MediationWorkflow {
  caseId: string;
  currentStep: string;
  steps: WorkflowStep[];
  completedSteps: string[];
  timeline: MediationEvent[];
  progress: number; // 0-100
  estimatedCompletion: Date;
}

interface MediationReport {
  caseId: string;
  reportType: 'progress' | 'final' | 'summary';
  generatedAt: Date;
  content: string;
  legalValidity: boolean;
  jurisdictions: string[];
  parties: string[];
  outcomes: string[];
  nextSteps?: string[];
}

export class MediationWorkflowService {
  private mediationService: MediationService;
  private aiMediationService: AIMediationService;

  constructor(private db: Pool) {
    this.mediationService = new MediationService(db);
    this.aiMediationService = new AIMediationService(db);
  }

  async initializeMediationWorkflow(caseId: string): Promise<MediationWorkflow> {
    try {
      const mediationCase = await this.mediationService.getMediationCase(caseId);
      if (!mediationCase) {
        throw new Error('Mediation case not found');
      }

      const workflow = this.createStandardWorkflow(mediationCase);
      
      // Add workflow initialization event
      await this.mediationService.addMediationEvent(caseId, {
        type: 'message',
        content: 'Mediation workflow initialized with standard process steps',
        party: 'system',
        metadata: {
          type: 'workflow_initialization',
          workflow: workflow
        }
      });

      logger.info(`Mediation workflow initialized for case ${caseId}`);
      return workflow;

    } catch (error) {
      logger.error('Error initializing mediation workflow:', error instanceof Error ? error.message : String(error));
      throw new Error('Failed to initialize mediation workflow');
    }
  }

  async updateWorkflowProgress(
    caseId: string,
    stepId: string,
    completed: boolean,
    notes?: string
  ): Promise<MediationWorkflow> {
    try {
      const mediationCase = await this.mediationService.getMediationCase(caseId);
      if (!mediationCase) {
        throw new Error('Mediation case not found');
      }

      const workflow = this.createStandardWorkflow(mediationCase);
      
      if (completed) {
        workflow.completedSteps.push(stepId);
        
        // Update progress percentage
        workflow.progress = (workflow.completedSteps.length / workflow.steps.length) * 100;
        
        // Determine next step
        const currentStepIndex = workflow.steps.findIndex(step => step.id === stepId);
        if (currentStepIndex < workflow.steps.length - 1) {
          workflow.currentStep = workflow.steps[currentStepIndex + 1].id;
        } else {
          workflow.currentStep = 'completed';
        }
      }

      // Add workflow progress event
      await this.mediationService.addMediationEvent(caseId, {
        type: 'message',
        content: `Workflow step ${completed ? 'completed' : 'updated'}: ${stepId}${notes ? ` - ${notes}` : ''}`,
        party: 'system',
        metadata: {
          type: 'workflow_progress',
          stepId,
          completed,
          notes,
          progress: workflow.progress
        }
      });

      // Check if workflow is complete
      if (workflow.progress === 100) {
        await this.completeMediation(caseId);
      }

      logger.info(`Workflow progress updated for case ${caseId}: ${workflow.progress}%`);
      return workflow;

    } catch (error) {
      logger.error('Error updating workflow progress:', error instanceof Error ? error.message : String(error));
      throw new Error('Failed to update workflow progress');
    }
  }

  async generateProgressReport(caseId: string): Promise<MediationReport> {
    try {
      const mediationCase = await this.mediationService.getMediationCase(caseId);
      if (!mediationCase) {
        throw new Error('Mediation case not found');
      }

      const workflow = this.createStandardWorkflow(mediationCase);
      
      const report: MediationReport = {
        caseId,
        reportType: 'progress',
        generatedAt: new Date(),
        content: await this.generateProgressReportContent(mediationCase, workflow),
        legalValidity: false, // Progress reports are not legally binding
        jurisdictions: mediationCase.dispute.jurisdiction,
        parties: mediationCase.parties.map(p => p.contactInfo.email),
        outcomes: this.extractOutcomes(mediationCase.timeline),
        nextSteps: this.getNextSteps(workflow)
      };

      // Add report generation event
      await this.mediationService.addMediationEvent(caseId, {
        type: 'document',
        content: 'Progress report generated',
        party: 'system',
        metadata: {
          type: 'report_generation',
          reportType: 'progress',
          reportId: `progress_${Date.now()}`
        }
      });

      logger.info(`Progress report generated for case ${caseId}`);
      return report;

    } catch (error) {
      logger.error('Error generating progress report:', error instanceof Error ? error.message : String(error));
      throw new Error('Failed to generate progress report');
    }
  }

  async generateFinalReport(caseId: string): Promise<MediationReport> {
    try {
      const mediationCase = await this.mediationService.getMediationCase(caseId);
      if (!mediationCase) {
        throw new Error('Mediation case not found');
      }

      if (mediationCase.status !== 'resolved') {
        throw new Error('Cannot generate final report for unresolved case');
      }

      const comprehensiveReport = await this.aiMediationService.generateComprehensiveMediationReport(caseId);
      
      const report: MediationReport = {
        caseId,
        reportType: 'final',
        generatedAt: new Date(),
        content: await this.generateFinalReportContent(mediationCase, comprehensiveReport),
        legalValidity: true, // Final reports have legal validity
        jurisdictions: mediationCase.dispute.jurisdiction,
        parties: mediationCase.parties.map(p => p.contactInfo.email),
        outcomes: this.extractOutcomes(mediationCase.timeline),
        nextSteps: this.getFinalNextSteps(mediationCase)
      };

      // Add final report generation event
      await this.mediationService.addMediationEvent(caseId, {
        type: 'document',
        content: 'Final mediation report generated with legal validity',
        party: 'system',
        metadata: {
          type: 'final_report_generation',
          reportId: `final_${Date.now()}`,
          legalValidity: true
        }
      });

      logger.info(`Final report generated for case ${caseId}`);
      return report;

    } catch (error) {
      logger.error('Error generating final report:', error instanceof Error ? error.message : String(error));
      throw new Error('Failed to generate final report');
    }
  }

  async trackMediationOutcome(
    caseId: string,
    outcome: 'agreement_reached' | 'partial_agreement' | 'no_agreement' | 'escalated',
    details: string,
    agreementTerms?: string[]
  ): Promise<void> {
    try {
      // Update case status based on outcome
      let newStatus: MediationStatus;
      switch (outcome) {
        case 'agreement_reached':
          newStatus = 'resolved';
          break;
        case 'partial_agreement':
          newStatus = 'resolved';
          break;
        case 'no_agreement':
          newStatus = 'failed';
          break;
        case 'escalated':
          newStatus = 'escalated';
          break;
      }

      await this.mediationService.updateMediationStatus(caseId, newStatus);

      // Add outcome tracking event
      await this.mediationService.addMediationEvent(caseId, {
        type: 'agreement',
        content: `Mediation outcome: ${outcome} - ${details}`,
        party: 'system',
        metadata: {
          type: 'outcome_tracking',
          outcome,
          details,
          agreementTerms: agreementTerms || [],
          timestamp: new Date()
        }
      });

      // If agreement reached, add agreement terms
      if (agreementTerms && agreementTerms.length > 0) {
        for (const term of agreementTerms) {
          await this.mediationService.addMediationEvent(caseId, {
            type: 'agreement',
            content: `Agreement term: ${term}`,
            party: 'system',
            metadata: {
              type: 'agreement_term',
              term
            }
          });
        }
      }

      logger.info(`Mediation outcome tracked for case ${caseId}: ${outcome}`);

    } catch (error) {
      logger.error('Error tracking mediation outcome:', error instanceof Error ? error.message : String(error));
      throw new Error('Failed to track mediation outcome');
    }
  }

  async generateNextStepRecommendations(caseId: string): Promise<string[]> {
    try {
      const mediationCase = await this.mediationService.getMediationCase(caseId);
      if (!mediationCase) {
        throw new Error('Mediation case not found');
      }

      const workflow = this.createStandardWorkflow(mediationCase);
      const escalationRisk = await this.aiMediationService.detectEscalationRisk(caseId);
      
      let recommendations: string[] = [];

      // Base recommendations on current workflow step
      const currentStep = workflow.steps.find(step => step.id === workflow.currentStep);
      if (currentStep) {
        recommendations.push(...currentStep.nextSteps);
      }

      // Add escalation-specific recommendations
      if (escalationRisk.riskLevel === 'high') {
        recommendations.unshift('URGENT: Consider immediate intervention or cooling-off period');
        recommendations.push('Evaluate need for professional mediator');
      } else if (escalationRisk.riskLevel === 'medium') {
        recommendations.push('Monitor communication tone closely');
        recommendations.push('Consider structured communication guidelines');
      }

      // Add status-specific recommendations
      switch (mediationCase.status) {
        case 'active':
          recommendations.push('Continue regular check-ins with all parties');
          break;
        case 'pending':
          recommendations.push('Follow up with parties to resume mediation');
          break;
        case 'resolved':
          recommendations.push('Prepare final documentation');
          recommendations.push('Schedule follow-up to ensure compliance');
          break;
        case 'failed':
          recommendations.push('Consider alternative dispute resolution methods');
          recommendations.push('Provide litigation guidance if appropriate');
          break;
        case 'escalated':
          recommendations.push('Engage professional mediator or legal counsel');
          break;
      }

      // Add AI-generated recommendations
      const aiInsights = await this.aiMediationService.updateMediationWithAIInsights(caseId);
      recommendations.push(...aiInsights.recommendation.nextSteps);

      // Remove duplicates and return
      const uniqueRecommendations = [...new Set(recommendations)];

      logger.info(`Next step recommendations generated for case ${caseId}: ${uniqueRecommendations.length} items`);
      return uniqueRecommendations;

    } catch (error) {
      logger.error('Error generating next step recommendations:', error instanceof Error ? error.message : String(error));
      throw new Error('Failed to generate next step recommendations');
    }
  }

  private createStandardWorkflow(mediationCase: MediationCase): MediationWorkflow {
    const steps: WorkflowStep[] = [
      {
        id: 'case_initiation',
        name: 'Case Initiation',
        description: 'Initial case setup and party notification',
        requiredActions: ['Notify all parties', 'Establish communication channels', 'Set ground rules'],
        completionCriteria: ['All parties acknowledged', 'Communication preferences set'],
        estimatedDuration: '1-2 days',
        nextSteps: ['Begin information gathering']
      },
      {
        id: 'information_gathering',
        name: 'Information Gathering',
        description: 'Collect facts and positions from all parties',
        requiredActions: ['Gather party statements', 'Collect supporting documents', 'Identify key issues'],
        completionCriteria: ['All party positions documented', 'Key issues identified'],
        estimatedDuration: '3-5 days',
        nextSteps: ['Analyze positions and identify common ground']
      },
      {
        id: 'issue_identification',
        name: 'Issue Identification',
        description: 'Identify and prioritize disputed issues',
        requiredActions: ['List all disputed points', 'Prioritize issues', 'Identify common interests'],
        completionCriteria: ['Issue list agreed by parties', 'Priorities established'],
        estimatedDuration: '2-3 days',
        nextSteps: ['Begin negotiation on priority issues']
      },
      {
        id: 'negotiation_facilitation',
        name: 'Negotiation Facilitation',
        description: 'Facilitate discussions between parties',
        requiredActions: ['Moderate discussions', 'Propose solutions', 'Document agreements'],
        completionCriteria: ['Progress made on key issues', 'Partial agreements documented'],
        estimatedDuration: '5-10 days',
        nextSteps: ['Work toward comprehensive agreement']
      },
      {
        id: 'agreement_drafting',
        name: 'Agreement Drafting',
        description: 'Draft formal agreement based on negotiations',
        requiredActions: ['Draft agreement terms', 'Review with parties', 'Finalize language'],
        completionCriteria: ['Agreement draft completed', 'All parties reviewed'],
        estimatedDuration: '2-4 days',
        nextSteps: ['Obtain final approvals']
      },
      {
        id: 'finalization',
        name: 'Finalization',
        description: 'Finalize agreement and close case',
        requiredActions: ['Obtain signatures', 'Generate final report', 'Close case'],
        completionCriteria: ['Agreement signed', 'Final report generated'],
        estimatedDuration: '1-2 days',
        nextSteps: ['Monitor compliance if needed']
      }
    ];

    // Determine current step based on case timeline and status
    let currentStep = 'case_initiation';
    let completedSteps: string[] = [];
    let progress = 0;

    // Simple logic to determine progress based on timeline events
    const eventTypes = mediationCase.timeline.map(event => event.type);
    
    if (eventTypes.includes('message')) {
      completedSteps.push('case_initiation');
      currentStep = 'information_gathering';
      progress = 16.67;
    }
    
    if (eventTypes.includes('document')) {
      completedSteps.push('information_gathering');
      currentStep = 'issue_identification';
      progress = 33.33;
    }
    
    if (eventTypes.includes('proposal')) {
      completedSteps.push('issue_identification');
      currentStep = 'negotiation_facilitation';
      progress = 50;
    }
    
    if (eventTypes.includes('agreement')) {
      completedSteps.push('negotiation_facilitation');
      currentStep = 'agreement_drafting';
      progress = 66.67;
    }
    
    if (mediationCase.status === 'resolved') {
      completedSteps = steps.map(step => step.id);
      currentStep = 'completed';
      progress = 100;
    }

    // Estimate completion date
    const estimatedCompletion = new Date();
    estimatedCompletion.setDate(estimatedCompletion.getDate() + 14); // Default 2 weeks

    return {
      caseId: mediationCase.id,
      currentStep,
      steps,
      completedSteps,
      timeline: mediationCase.timeline,
      progress,
      estimatedCompletion
    };
  }

  private async generateProgressReportContent(
    mediationCase: MediationCase,
    workflow: MediationWorkflow
  ): Promise<string> {
    return `
MEDIATION PROGRESS REPORT

Case ID: ${mediationCase.id}
Generated: ${new Date().toISOString()}
Status: ${mediationCase.status}
Progress: ${workflow.progress.toFixed(1)}%

CASE OVERVIEW
Category: ${mediationCase.dispute.category}
Jurisdictions: ${mediationCase.dispute.jurisdiction.join(', ')}
Parties: ${mediationCase.parties.map(p => `${p.role} (${p.contactInfo.email})`).join(', ')}

DISPUTE SUMMARY
${mediationCase.dispute.summary}

WORKFLOW PROGRESS
Current Step: ${workflow.currentStep}
Completed Steps: ${workflow.completedSteps.length}/${workflow.steps.length}

${workflow.steps.map(step => {
  const isCompleted = workflow.completedSteps.includes(step.id);
  const isCurrent = workflow.currentStep === step.id;
  const status = isCompleted ? '✓ COMPLETED' : isCurrent ? '→ IN PROGRESS' : '○ PENDING';
  
  return `${status} ${step.name}
   ${step.description}
   Duration: ${step.estimatedDuration}`;
}).join('\n\n')}

RECENT ACTIVITY
${mediationCase.timeline.slice(-5).map(event => 
  `${event.timestamp.toISOString()}: ${event.type} by ${event.party} - ${event.content}`
).join('\n')}

CULTURAL CONSIDERATIONS
${mediationCase.dispute.culturalFactors.join(', ')}

ESTIMATED COMPLETION
${workflow.estimatedCompletion.toISOString()}

This is a progress report and does not constitute a legally binding document.
    `.trim();
  }

  private async generateFinalReportContent(
    mediationCase: MediationCase,
    aiReport: string
  ): Promise<string> {
    return `
FINAL MEDIATION REPORT

Case ID: ${mediationCase.id}
Generated: ${new Date().toISOString()}
Status: ${mediationCase.status}
Legal Validity: This report constitutes an official record of the mediation process

CASE INFORMATION
Category: ${mediationCase.dispute.category}
Jurisdictions: ${mediationCase.dispute.jurisdiction.join(', ')}
Parties: ${mediationCase.parties.map(p => `${p.role}: ${p.contactInfo.email}`).join(', ')}
Duration: ${mediationCase.createdAt.toISOString()} to ${new Date().toISOString()}

DISPUTE SUMMARY
${mediationCase.dispute.summary}

AI-GENERATED COMPREHENSIVE ANALYSIS
${aiReport}

FINAL OUTCOMES
${this.extractOutcomes(mediationCase.timeline).join('\n')}

AGREEMENTS REACHED
${mediationCase.timeline
  .filter(event => event.type === 'agreement')
  .map(event => `- ${event.content}`)
  .join('\n')}

LEGAL COMPLIANCE
This mediation was conducted in accordance with the laws of: ${mediationCase.dispute.jurisdiction.join(', ')}
Cultural considerations were incorporated throughout the process.

NEXT STEPS
${this.getFinalNextSteps(mediationCase).join('\n')}

CERTIFICATION
This report accurately reflects the mediation process and outcomes as recorded in the system.
Generated by JurisGuide AI Mediation Platform on ${new Date().toISOString()}

This document has legal validity in the specified jurisdictions.
    `.trim();
  }

  private extractOutcomes(timeline: MediationEvent[]): string[] {
    return timeline
      .filter(event => event.type === 'agreement' || event.metadata?.type === 'outcome_tracking')
      .map(event => event.content);
  }

  private getNextSteps(workflow: MediationWorkflow): string[] {
    const currentStep = workflow.steps.find(step => step.id === workflow.currentStep);
    return currentStep ? currentStep.nextSteps : ['Review case status'];
  }

  private getFinalNextSteps(mediationCase: MediationCase): string[] {
    const steps = ['Monitor compliance with agreements'];
    
    if (mediationCase.status === 'resolved') {
      steps.push('Schedule follow-up review in 30 days');
      steps.push('Provide implementation support if needed');
    } else if (mediationCase.status === 'failed') {
      steps.push('Consider alternative dispute resolution');
      steps.push('Provide litigation guidance');
    } else if (mediationCase.status === 'escalated') {
      steps.push('Engage professional legal counsel');
      steps.push('Prepare for formal legal proceedings');
    }
    
    return steps;
  }

  private async completeMediation(caseId: string): Promise<void> {
    await this.mediationService.updateMediationStatus(caseId, 'resolved');
    
    await this.mediationService.addMediationEvent(caseId, {
      type: 'message',
      content: 'Mediation workflow completed successfully',
      party: 'system',
      metadata: {
        type: 'workflow_completion',
        completedAt: new Date()
      }
    });
  }
}