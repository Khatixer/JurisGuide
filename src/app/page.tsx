import Link from 'next/link';
import Navigation from '@/components/navigation';
import Footer from '@/components/footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#0A2540] to-[#0A2540]/90 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Your AI Guide to <span className="text-[#00C48C]">Legal Clarity</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-200 max-w-3xl mx-auto">
              Get instant AI-powered legal guidance and resolve disputes through intelligent mediation. 
              Navigate complex legal matters with confidence.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/signup" 
                className="bg-[#00C48C] text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-[#00C48C]/90 transition-colors"
              >
                Get Started Free
              </Link>
              <Link 
                href="/how-it-works" 
                className="border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white hover:text-[#0A2540] transition-colors"
              >
                See How It Works
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0A2540] mb-6">
              Legal Challenges Shouldn't Be Overwhelming
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Traditional legal processes are expensive, time-consuming, and often inaccessible. 
              Many people struggle with legal questions and disputes without proper guidance.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💸</span>
              </div>
              <h3 className="text-xl font-semibold text-[#0A2540] mb-2">Expensive Legal Fees</h3>
              <p className="text-gray-600">Legal consultation can cost hundreds per hour, making it inaccessible for many.</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⏰</span>
              </div>
              <h3 className="text-xl font-semibold text-[#0A2540] mb-2">Time-Consuming Process</h3>
              <p className="text-gray-600">Getting legal help often takes weeks or months, delaying important decisions.</p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🌍</span>
              </div>
              <h3 className="text-xl font-semibold text-[#0A2540] mb-2">Cross-Border Complexity</h3>
              <p className="text-gray-600">International disputes involve multiple legal systems and jurisdictions.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0A2540] mb-6">
              AI-Powered Legal Solutions
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              JurisGuide combines artificial intelligence with legal expertise to provide instant guidance 
              and facilitate dispute resolution, making legal help accessible to everyone.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold text-[#0A2540] mb-4">Instant AI Legal Guidance</h3>
              <p className="text-gray-600 mb-6">
                Describe your legal situation and receive immediate, AI-powered guidance based on relevant laws and regulations. 
                Get clarity on your rights, obligations, and next steps.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <span className="w-6 h-6 bg-[#00C48C] rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-sm">✓</span>
                  </span>
                  <span>24/7 availability</span>
                </li>
                <li className="flex items-center">
                  <span className="w-6 h-6 bg-[#00C48C] rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-sm">✓</span>
                  </span>
                  <span>Neutral, unbiased information</span>
                </li>
                <li className="flex items-center">
                  <span className="w-6 h-6 bg-[#00C48C] rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-sm">✓</span>
                  </span>
                  <span>Multiple jurisdiction support</span>
                </li>
              </ul>
            </div>
            <div className="bg-gray-100 rounded-lg p-8 text-center">
              <div className="text-6xl mb-4">🤖</div>
              <p className="text-gray-600">AI Legal Assistant Interface</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center mt-16">
            <div className="bg-gray-100 rounded-lg p-8 text-center md:order-1">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-gray-600">Real-time Mediation Platform</p>
            </div>
            <div className="md:order-2">
              <h3 className="text-2xl font-bold text-[#0A2540] mb-4">AI-Assisted Mediation</h3>
              <p className="text-gray-600 mb-6">
                Resolve disputes collaboratively with AI-powered mediation assistance. 
                Our platform facilitates communication and suggests fair solutions based on similar cases.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <span className="w-6 h-6 bg-[#00C48C] rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-sm">✓</span>
                  </span>
                  <span>Real-time communication</span>
                </li>
                <li className="flex items-center">
                  <span className="w-6 h-6 bg-[#00C48C] rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-sm">✓</span>
                  </span>
                  <span>AI mediation suggestions</span>
                </li>
                <li className="flex items-center">
                  <span className="w-6 h-6 bg-[#00C48C] rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-sm">✓</span>
                  </span>
                  <span>Secure, private environment</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0A2540] mb-6">
              Trusted by Legal Professionals Worldwide
            </h2>
            <p className="text-xl text-gray-600">
              See what our users say about their experience with JurisGuide
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-[#0A2540] rounded-full flex items-center justify-center text-white font-bold">
                  SM
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold text-[#0A2540]">Sarah Martinez</h4>
                  <p className="text-gray-600 text-sm">Small Business Owner</p>
                </div>
              </div>
              <p className="text-gray-600 mb-4">
                "JurisGuide helped me understand my contract obligations instantly. 
                The AI guidance was clear and actionable, saving me hundreds in legal fees."
              </p>
              <div className="flex text-[#00C48C]">
                ★★★★★
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-[#0A2540] rounded-full flex items-center justify-center text-white font-bold">
                  JC
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold text-[#0A2540]">James Chen</h4>
                  <p className="text-gray-600 text-sm">International Trader</p>
                </div>
              </div>
              <p className="text-gray-600 mb-4">
                "The cross-border dispute resolution feature is incredible. 
                We resolved our international contract dispute in days, not months."
              </p>
              <div className="flex text-[#00C48C]">
                ★★★★★
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-[#0A2540] rounded-full flex items-center justify-center text-white font-bold">
                  AR
                </div>
                <div className="ml-4">
                  <h4 className="font-semibold text-[#0A2540]">Anna Rodriguez</h4>
                  <p className="text-gray-600 text-sm">Legal Professional</p>
                </div>
              </div>
              <p className="text-gray-600 mb-4">
                "As a lawyer, I use JurisGuide for quick research and client mediation. 
                The AI assistance is remarkably accurate and helpful."
              </p>
              <div className="flex text-[#00C48C]">
                ★★★★★
              </div>
            </div>
          </div>
          
          {/* Trust Indicators */}
          <div className="mt-16 text-center">
            <p className="text-gray-600 mb-8">Featured in</p>
            <div className="flex justify-center items-center space-x-12 opacity-60">
              <div className="text-2xl font-bold text-gray-400">Forbes</div>
              <div className="text-2xl font-bold text-gray-400">TechCrunch</div>
              <div className="text-2xl font-bold text-gray-400">Legal Tech</div>
              <div className="text-2xl font-bold text-gray-400">AI News</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[#0A2540] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Get Legal Clarity?
          </h2>
          <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
            Join thousands of users who trust JurisGuide for their legal guidance and dispute resolution needs.
          </p>
          <Link 
            href="/signup" 
            className="bg-[#00C48C] text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-[#00C48C]/90 transition-colors inline-block"
          >
            Start Your Free Trial
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
