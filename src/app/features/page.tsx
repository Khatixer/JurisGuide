import Navigation from '@/components/navigation'
import Footer from '@/components/footer'

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#0A2540] to-[#0A2540]/90 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Powerful Features for <span className="text-[#00C48C]">Legal Clarity</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-200 max-w-3xl mx-auto">
              Discover how JurisGuide's AI-powered features help you navigate legal challenges with confidence.
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-sm border">
              <div className="w-12 h-12 bg-[#00C48C] rounded-lg flex items-center justify-center mb-4">
                <span className="text-white text-xl">🤖</span>
              </div>
              <h3 className="text-xl font-semibold text-[#0A2540] mb-3">AI Legal Guidance</h3>
              <p className="text-gray-600">Get instant, AI-powered legal information and guidance tailored to your specific situation.</p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-sm border">
              <div className="w-12 h-12 bg-[#00C48C] rounded-lg flex items-center justify-center mb-4">
                <span className="text-white text-xl">💬</span>
              </div>
              <h3 className="text-xl font-semibold text-[#0A2540] mb-3">Smart Mediation</h3>
              <p className="text-gray-600">Resolve disputes through AI-assisted mediation with real-time communication tools.</p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-sm border">
              <div className="w-12 h-12 bg-[#00C48C] rounded-lg flex items-center justify-center mb-4">
                <span className="text-white text-xl">🌍</span>
              </div>
              <h3 className="text-xl font-semibold text-[#0A2540] mb-3">Cross-Border Support</h3>
              <p className="text-gray-600">Navigate international legal matters with multi-jurisdiction expertise.</p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-sm border">
              <div className="w-12 h-12 bg-[#00C48C] rounded-lg flex items-center justify-center mb-4">
                <span className="text-white text-xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold text-[#0A2540] mb-3">Case Management</h3>
              <p className="text-gray-600">Organize and track your legal cases with comprehensive case management tools.</p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-sm border">
              <div className="w-12 h-12 bg-[#00C48C] rounded-lg flex items-center justify-center mb-4">
                <span className="text-white text-xl">🔒</span>
              </div>
              <h3 className="text-xl font-semibold text-[#0A2540] mb-3">Secure & Private</h3>
              <p className="text-gray-600">Your legal information is protected with enterprise-grade security and privacy.</p>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-sm border">
              <div className="w-12 h-12 bg-[#00C48C] rounded-lg flex items-center justify-center mb-4">
                <span className="text-white text-xl">⚡</span>
              </div>
              <h3 className="text-xl font-semibold text-[#0A2540] mb-3">Real-Time Updates</h3>
              <p className="text-gray-600">Stay informed with instant notifications and real-time case updates.</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}