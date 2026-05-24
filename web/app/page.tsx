"use client"

import { Canvas } from "@react-three/fiber"
import { Environment } from "@react-three/drei"
import { Suspense, useEffect, useState, useRef } from "react"
import { motion } from "framer-motion"
import { ChevronDown } from "lucide-react"
import FootballScene from "./components/FootBallScene"
import GoalixText from "./components/GoalixText"
import FeaturesSection, { HowItWorksSection ,}  from "./components/FeaturesSection"
import NavBar1 from "./components/ui/NavBar1"

// Component to handle navbar padding
function NavbarPadding() {
  const [shouldShowPadding, setShouldShowPadding] = useState(false)
  
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const windowHeight = window.innerHeight
      const section = Math.floor(scrollY / windowHeight)
      
      // Show padding when not in first section (FootballScene section)
      setShouldShowPadding(section > 0)
    }
    
    // Initial check
    handleScroll()
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  
  return shouldShowPadding ? <div className="h-16" /> : null
}

export default function Home() {
  const [showText, setShowText] = useState(false)
  const [currentSection, setCurrentSection] = useState(0)
  const [isScrolling, setIsScrolling] = useState(false)
  const sectionsRef = useRef<HTMLDivElement>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Prevent spacebar from scrolling the page
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Handle scroll events
  useEffect(() => {
    const handleScroll = () => {
      if (currentSection === 0) {
        setIsScrolling(true)
        
        // Clear existing timeout
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current)
        }
        
        // Set timeout to snap to next section
        scrollTimeoutRef.current = setTimeout(() => {
          setCurrentSection(1)
          setIsScrolling(false)
          // Smooth scroll to next section
          if (sectionsRef.current) {
            sectionsRef.current.scrollTo({
              top: window.innerHeight,
              behavior: 'smooth'
            })
          }
        }, 300) // 300ms delay before snapping
      }
    }

    window.addEventListener('scroll', handleScroll)
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [currentSection])

  // Handle wheel events for immediate response
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (currentSection === 0 && !isScrolling) {
        e.preventDefault()
        setCurrentSection(1)
        setIsScrolling(true)
        
        // Smooth scroll to next section
        if (sectionsRef.current) {
          sectionsRef.current.scrollTo({
            top: window.innerHeight,
            behavior: 'smooth'
          })
        }
        
        // Reset scrolling state after animation
        setTimeout(() => {
          setIsScrolling(false)
        }, 1000)
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: false })
    
    return () => {
      window.removeEventListener('wheel', handleWheel)
    }
  }, [currentSection, isScrolling])

  const handleShowText = (show: boolean) => {
    setShowText(show)
  }

  return (
    <>
      <NavbarPadding />
      <NavBar1 />
      <div ref={sectionsRef} className="h-screen overflow-y-auto snap-y snap-mandatory">
        {/* Section 1: FootballScene */}
        <section className="h-screen snap-start relative">
          {/* Canvas sandwich container */}
          <div className="relative w-full h-screen">
            {/* Bottom div - behind canvas with football ground background */}
            <div 
              className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat "
              style={{
                backgroundImage: "url('/ground.png')",
                opacity: 0.5
              
              }}
            />
            
            {/* Solid overlay for better contrast */}
            <div 
              className="absolute inset-0 z-1"
              style={{
                
              }}
            />

            {/* 3D Canvas - middle layer */}
            <div className="absolute inset-0 z-10">
           
              <Canvas camera={{ position: [0, 0, 20], fov: 50 }} className="w-full h-screen">
                <Suspense fallback={null}>
                  <Environment preset="night" />
                  <ambientLight intensity={0.5} />
                  <directionalLight position={[10, 10, 5]} intensity={3} />
                  <FootballScene onShowText={handleShowText} />
                </Suspense>
              </Canvas>
              
            </div>

            {/* Goalix Text Overlay */}
            <GoalixText
              showText={showText}
            />

            {/* Scroll indicator */}
            <motion.div
              className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white text-center pointer-events-auto z-20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 4, duration: 1 }}
            >
              <div className="flex flex-col items-center space-y-2">
                <motion.div
                  animate={{ y: [0, 8, 0] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                >
                  <ChevronDown className="w-6 h-6" />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Section 2: Features */}
        <section className="h-screen snap-start">          
          <FeaturesSection />
        </section>
        <section className="h-screen snap-start">          
          <HowItWorksSection />
        </section>
      </div>
    </>
  )
}
