import Navigation from '@/components/navigation'
import Footer from '@/components/footer'

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#0A2540] to-[#0A2540]/90 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Simple, <span className="text-[#00C48C]">Transparent</span> Pricing
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-200 max-w-3xl mx-auto">
              Choose the plan that fits your legal guidance needs. Start free, upgrade when you need more.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Free Plan */}
            <div className="bg-white p-8 rounded-lg shadow-sm border">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-[#0A2540] mb-4">Free</h3>
                <div className="text-4xl font-bold text-[#0A2540] mb-2">$0</div>
                <p className="text-gray-600 mb-6">per month</p>
                <ul className="text-left space-y-3 mb-8">
                  <li className="flex items-center">
                    <span className="w-5 h-5 bg-[#00C48C] rounded-full flex items-center justify-center mr-3">
                      <span className="text-white text-xs">✓</span>
                    </span>
                    <span>5 AI guidance sessions per month</span>
                  </li>
                  <li className="flex items-center">
                    <span className="w-5 h-5 bg-[#00C48C] rounded-full flex items-center justify-center mr-3">
                      <span className="text-white text-xs">✓</span>
                    </span>
                    <span>Basic legal information</span>
                  </li>
                  <li className="flex items-center">
                    <span className="w-5 h-5 bg-[#00C48C] rounded-full flex items-center justify-center mr-3">
                      <span className="text-white text-xs">✓</span>
                    </span>
                    <span>1 active case</span>
                  </li>
                  <li className="flex items-center">
                    <span className="w-5 h-5 bg-[#00C48C] rounded-full flex items-center justify-center mr-3">
                      <span className="text-white text-xs">✓</span>
                    </span>
                    <span>Email support</span>
                  </li>
                </ul>
                <button className="w-full bg-gray-200 text-[#0A2540] py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors">
                  Get Started Free
                </button>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="bg-white p-8 rounded-lg shadow-lg border-2 border-[#00C48C] relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-[#00C48C] text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </span>
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-[#0A2540] mb-4">Pro</h3>
                <div className="text-4xl font-bold text-[#0A2540] mb-2">$29</div>
                <p className="text-gray-600 mb-6">per month</p>
                <ul className="text-left space-y-3 mb-8">
                  <li className="flex items-center">
                    <span className="w-5 h-5 bg-[#00C48C] rounded-full flex items-center justify-center mr-3">
                      <span className="text-white text-xs">✓</span>
                    </span>
                    <span>Unlimited AI guidance sessions</span>
                  </li>
                  <li className="flex items-center">
                    <span className="w-5 h-5 bg-[#00C48C] rounded-full flex items-center justify-center mr-3">
                      <span className="text-white text-xs">✓</span>
                    </span>
                    <span>Advanced legal analysis</span>
                  </li>
                  <li className="flex items-center">
                    <span className="w-5 h-5 bg-[#00C48C] rounded-full flex items-center justify-center mr-3">
                      <span className="text-white text-xs">✓</span>
                    </span>
                    <span>10 active cases</span>
                  </li>
                  <li className="flex items-center">
                    <span className="w-5 h-5 bg-[#00C48C] rounded-full flex items-center justify-center mr-3">
                      <span className="text-white text-xs">✓</span>
                    </span>
                    <span>AI-assisted mediation</span>
                  </li>
                  <li className="flex items-center">
                    <span className="w-5 h-5 bg-[#00C48C] rounded-full flex items-center justify-center mr-3">
                      <span className="text-white text-xs">✓</span>
                    </span>
                    <span>Priority support</span>
                  </li>
                </ul>
                <button className="w-full bg-[#00C48C] text-white py-3 rounded-lg font-semibold hover:bg-[#00C48C]/90 transition-colors">
                  Start Pro Trial
                </button>
              </div>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white p-8 rounded-lg shadow-sm border">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-[#0A2540] mb-4">Enterprise</h3>
                <div className="text-4xl font-bold text-[#0A2540] mb-2">Custom</div>
                <p className="text-gray-600 mb-6">pricing</p>
                <ul className="text-left space-y-3 mb-8">
                  <li className="flex items-center">
                    <span className="w-5 h-5 bg-[#00C48C] rounded-full flex items-center justify-center mr-3">
                      <span className="text-white text-xs">✓</span>
                    </span>
                    <span>Everything in Pro</span>
                  </li>
                  <li className="flex items-center">
                    <span className="w-5 h-5 bg-[#00C48C] rounded-full flex items-center justify-center mr-3">
                      <span className="text-white text-xs">✓</span>
                    </span>
                    <span>Unlimited cases</span>
                  </li>
                  <li className="flex items-center">
                    <span className="w-5 h-5 bg-[#00C48C] rounded-full flex items-center justify-center mr-3">
                      <span className="text-white text-xs">✓</span>
                    </span>
                    <span>Custom integrations</span>
                  </li>
                  <li className="flex items-center">
                    <span className="w-5 h-5 bg-[#00C48C] rounded-full flex items-center justify-center mr-3">
                      <span className="text-white text-xs">✓</span>
                    </span>
                    <span>Dedicated support</span>
                  </li>
                  <li className="flex items-center">
                    <span className="w-5 h-5 bg-[#00C48C] rounded-full flex items-center justify-center mr-3">
                      <span className="text-white text-xs">✓</span>
                    </span>
                    <span>SLA guarantee</span>
                  </li>
                </ul>
                <button className="w-full bg-[#0A2540] text-white py-3 rounded-lg font-semibold hover:bg-[#0A2540]/90 transition-colors">
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}