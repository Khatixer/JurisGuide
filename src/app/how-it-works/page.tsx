import Navigation from '@/components/navigation'
import Footer from '@/components/footer'

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#0A2540] to-[#0A2540]/90 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              How <span className="text-[#00C48C]">JurisGuide</span> Works
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-200 max-w-3xl mx-auto">
              Simple steps to get the legal guidance and dispute resolution you need.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Steps */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-16">
            {/* Step 1 */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-[#00C48C] rounded-full flex items-center justify-center text-white font-bold text-xl mr-4">
                    1
                  </div>
                  <h3 className="text-2xl font-bold text-[#0A2540]">Sign Up & Describe Your Situation</h3>
                </div>
                <p className="text-gray-600 text-lg">
                  Create your account and describe your legal question or dispute. Our AI will analyze your situation and provide initial guidance.
                </p>
              </div>
              <div className="bg-gray-100 rounded-lg p-8 text-center">
                <div className="text-6xl mb-4">📝</div>
                <p className="text-gray-600">Describe your legal situation</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="bg-gray-100 rounded-lg p-8 text-center md:order-1">
                <div className="text-6xl mb-4">🤖</div>
                <p className="text-gray-600">Get AI-powered legal guidance</p>
              </div>
              <div className="md:order-2">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-[#00C48C] rounded-full flex items-center justify-center text-white font-bold text-xl mr-4">
                    2
                  </div>
                  <h3 className="text-2xl font-bold text-[#0A2540]">Receive AI Legal Guidance</h3>
                </div>
                <p className="text-gray-600 text-lg">
                  Our AI analyzes your situation and provides relevant legal information, potential options, and next steps based on applicable laws.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-[#00C48C] rounded-full flex items-center justify-center text-white font-bold text-xl mr-4">
                    3
                  </div>
                  <h3 className="text-2xl font-bold text-[#0A2540]">Create a Case (If Needed)</h3>
                </div>
                <p className="text-gray-600 text-lg">
                  For disputes involving multiple parties, create a case and invite other participants to join the mediation process.
                </p>
              </div>
              <div className="bg-gray-100 rounded-lg p-8 text-center">
                <div className="text-6xl mb-4">📋</div>
                <p className="text-gray-600">Create and manage cases</p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="bg-gray-100 rounded-lg p-8 text-center md:order-1">
                <div className="text-6xl mb-4">💬</div>
                <p className="text-gray-600">Collaborate with AI mediation</p>
              </div>
              <div className="md:order-2">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-[#00C48C] rounded-full flex items-center justify-center text-white font-bold text-xl mr-4">
                    4
                  </div>
                  <h3 className="text-2xl font-bold text-[#0A2540]">Collaborate & Resolve</h3>
                </div>
                <p className="text-gray-600 text-lg">
                  Work with other parties through our AI-assisted mediation platform to find mutually beneficial solutions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}