import React from 'react'
import { motion } from 'framer-motion'

const TemplateNFTsSection = () => {
  const nftCollections = [
    {
      name: 'LEGEND',
      color: 'from-purple-600 to-blue-600',
      players: ['Messi', 'Ronaldo', 'Neymar', 'Mbappé', 'Benzema'],
      rarity: 'Ultra Rare',
      totalCards: 50
    },
    {
      name: 'HEROES',
      color: 'from-orange-500 to-red-600',
      players: ['Haaland', 'Salah', 'De Bruyne', 'Lewandowski', 'Modrić'],
      rarity: 'Epic',
      totalCards: 150
    },
    {
      name: 'RISING',
      color: 'from-green-500 to-teal-600',
      players: ['Bellingham', 'Pedri', 'Gavi', 'Camavinga', 'Musiala'],
      rarity: 'Rare',
      totalCards: 300
    },
    {
      name: 'CLASSIC',
      color: 'from-yellow-600 to-orange-600',
      players: ['Kane', 'Grealish', 'Mount', 'Rice', 'Foden'],
      rarity: 'Common',
      totalCards: 500
    }
  ]

  return (
    <section className="relative py-20 bg-gradient-to-b from-black to-gray-900">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
            Template NFTs <span className="text-green-400">🎴</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Collect unique player cards across different rarity tiers. Each NFT represents 
            a tokenized player with real performance data and trading value.
          </p>
        </motion.div>

        {/* NFT Collections */}
        <div className="space-y-8">
          {nftCollections.map((collection, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              className="relative"
            >
              {/* Collection container */}
              <div className={`bg-gradient-to-r ${collection.color} rounded-2xl p-8 relative overflow-hidden`}>
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-4 left-4 w-32 h-32 border-2 border-white rounded-full"></div>
                  <div className="absolute bottom-4 right-4 w-24 h-24 border border-white rounded-full"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 border border-white/50 rounded-full"></div>
                </div>

                <div className="relative z-10">
                  <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                    {/* Collection info */}
                    <div className="text-center lg:text-left">
                      <h3 className="text-4xl md:text-5xl font-black text-white mb-4">
                        {collection.name}
                      </h3>
                      <div className="space-y-2 mb-6">
                        <div className="text-white/90 text-lg">
                          <span className="font-semibold">Rarity:</span> {collection.rarity}
                        </div>
                        <div className="text-white/90 text-lg">
                          <span className="font-semibold">Total Cards:</span> {collection.totalCards}
                        </div>
                      </div>
                      <button className="px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-bold rounded-lg transition-all duration-300 hover:scale-105">
                        Explore Collection
                      </button>
                    </div>

                    {/* Player cards preview */}
                    <div className="flex space-x-4 overflow-x-auto pb-4">
                      {collection.players.map((player, playerIndex) => (
                        <motion.div
                          key={playerIndex}
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.6, delay: playerIndex * 0.1 }}
                          className="flex-shrink-0 bg-black/30 backdrop-blur-sm border border-white/20 rounded-xl p-4 w-32 hover:scale-105 transition-transform duration-300"
                        >
                          {/* Player avatar */}
                          <div className="w-16 h-16 bg-white/20 rounded-full mx-auto mb-3 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                              {player.split(' ')[0].substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                          
                          {/* Player name */}
                          <div className="text-white text-center text-sm font-semibold">
                            {player}
                          </div>
                          
                          {/* Rating */}
                          <div className="text-center mt-2">
                            <span className="text-xs bg-white/20 text-white px-2 py-1 rounded">
                              {90 + Math.floor(Math.random() * 10)}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Call to action */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-center mt-16"
        >
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-white mb-4">Start Your Collection</h3>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Join thousands of collectors and traders building their ultimate football NFT portfolio. 
              Start with common cards and work your way up to legendary collections.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-8 py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-lg transition-all duration-300 hover:scale-105">
                Browse Marketplace
              </button>
              <button className="px-8 py-3 border-2 border-green-400 text-green-400 hover:bg-green-400 hover:text-black font-bold rounded-lg transition-all duration-300">
                Create Account
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default TemplateNFTsSection 