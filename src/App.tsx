/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, useScroll, useTransform, useSpring } from "motion/react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useAnimations, Environment, Float } from "@react-three/drei";
import { Suspense, useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as THREE from "three";
import Papa from "papaparse";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MENU_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQWkJMSOHk9DU0GtY_0XbHqG9eaYWqyqg5CDhiaaptCwO0clQ8zwkfFLFDnTaDKhhGVN9wBP68bSUUW/pub?output=csv&sheet=FAQ";
const FAQ_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQWkJMSOHk9DU0GtY_0XbHqG9eaYWqyqg5CDhiaaptCwO0clQ8zwkfFLFDnTaDKhhGVN9wBP68bSUUW/pub?output=csv&sheet=FAQ_REAL"; // Placeholder if they have a real FAQ sheet

const getRawGithubUrl = (url: string) => {
  if (!url) return "";
  if (url.includes("github.com") && url.includes("/blob/")) {
    return url
      .replace("github.com", "raw.githubusercontent.com")
      .replace("/blob/", "/");
  }
  return url;
};

function KamaModel({ scrollProgress }: { scrollProgress: any }) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations, cameras } = useGLTF("https://raw.githubusercontent.com/KamaBarTbilisi/Kama-Web-assets/0b28c2abb186c13c9e3c12ef57eeca7557ce2701/Kama%20V13.glb");
  const { actions, names } = useAnimations(animations, group);
  const { set, size } = useThree();

  useEffect(() => {
    if (cameras && cameras.length > 0) {
      const cam = cameras[0] as THREE.PerspectiveCamera;
      if (cam.isPerspectiveCamera) {
        cam.aspect = size.width / size.height;
        cam.updateProjectionMatrix();
      }
      set({ camera: cam });
    }
  }, [cameras, set, size.width, size.height]);

  useEffect(() => {
    // Play the first animation if it exists
    if (names.length > 0 && actions[names[0]]) {
      const action = actions[names[0]]!;
      action.play();
      action.paused = true; // We will manually control the time
    }
  }, [actions, names]);

  useFrame(() => {
    if (names.length > 0 && actions[names[0]]) {
      const action = actions[names[0]]!;
      const duration = action.getClip().duration;
      // Map scroll progress (0-1) to animation time (0-duration)
      action.time = scrollProgress.get() * duration;
    }
  });

  return (
    <primitive 
      ref={group} 
      object={scene} 
      scale={4.5} 
      position={[0, 0, 0]}
      rotation={[0, 0, 0]}
    />
  );
}

function AnimatedGroup({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  return <group ref={ref}>{children}</group>;
}

interface Product {
  id: string;
  image: string;
  en: {
    name: string;
    description: string[];
    nutrition: string;
    category: string;
  };
  ka: {
    name: string;
    description: string[];
    nutrition: string;
    category: string;
  };
}


interface FAQItem {
  id: string;
  en: {
    question: string;
    answer: string;
  };
  ka: {
    question: string;
    answer: string;
  };
}

// MENU_DATA is now fetched dynamically from Google Sheets

function MenuCard({ product, lang }: { product: Product; lang: "en" | "ka" }) {
  const [isTapped, setIsTapped] = useState(false);
  const data = product[lang];

  return (
    <motion.div 
      className="flex flex-col w-full max-w-[360px] cursor-pointer"
      onClick={() => setIsTapped(!isTapped)}
      initial="initial"
      whileHover="hover"
      animate={isTapped ? "hover" : "initial"}
    >
      {/* Image Frame */}
      <div className="relative aspect-square rounded-[24px] overflow-hidden bg-zinc-900 mb-6">
        <motion.img 
          src={product.image}
          alt={data.name}
          className="w-full h-full object-cover"
          variants={{
            initial: { filter: "blur(0px) brightness(1)", scale: 1 },
            hover: { filter: "blur(8px) brightness(0.5)", scale: 1.05 }
          }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          referrerPolicy="no-referrer"
        />

        {/* Description Overlay (On Image) */}
        <motion.div 
          variants={{
            initial: { opacity: 0, y: 10 },
            hover: { opacity: 1, y: 0 }
          }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/40 backdrop-blur-[2px]"
        >
          <div className="space-y-1 overflow-y-auto max-h-full scrollbar-hide">
            {data.description.length > 6 || data.description.some(d => d.length > 25) ? (
              <p className="text-[10px] text-white font-albert font-medium tracking-[0.1em] uppercase leading-relaxed">
                {data.description.join(", ")}
              </p>
            ) : (
              data.description.map((item, i) => (
                <p key={i} className="text-[10px] text-white font-albert font-medium tracking-[0.2em] uppercase leading-relaxed">
                  {item}
                </p>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Content Below */}
      <div className="px-1 mt-4">
        <h3 className="text-white font-albert font-bold text-base md:text-lg tracking-[0.1em] mb-2 uppercase leading-tight">
          {data.name || "Product Name"}
        </h3>
        <div className="space-y-1">
          <p className="text-[10px] text-white/40 font-albert font-medium tracking-[0.2em] uppercase leading-relaxed">
            {data.nutrition}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function MenuSection({ lang }: { lang: "en" | "ka" }) {
  const [menuData, setMenuData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(MENU_CSV_URL);
        const csvText = await response.text();
        
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim(),
          complete: (results) => {
            const parsedData: Product[] = results.data.map((row: any, index: number) => {
              // Helper to get value regardless of casing
              const getVal = (keys: string[]) => {
                const foundKey = Object.keys(row).find(k => keys.includes(k.trim()));
                return foundKey ? row[foundKey] : "";
              };

              const parseDescription = (val: string) => {
                if (!val) return [];
                // If it's a long sentence (more than 3 commas or very long), don't split it into a list for the overlay
                // Actually, let's keep it as an array but handle rendering differently
                return val.split(",").map((s: string) => s.trim()).filter(Boolean);
              };

              return {
                id: index.toString(),
                image: getRawGithubUrl(getVal(["Image Link"])),
                en: {
                  name: getVal(["Product name ENG", "Product Name ENG"]),
                  description: parseDescription(getVal(["Description ENG"])),
                  nutrition: getVal(["Nutriotion ENG", "Nutrition ENG"]),
                  category: getVal(["Category ENG"])
                },
                ka: {
                  name: getVal(["Product name GEO", "Product Name GEO"]),
                  description: parseDescription(getVal(["Description GEO"])),
                  nutrition: getVal(["Nutriotion GEO", "Nutrition GEO"]),
                  category: getVal(["Category GEO"])
                }
              };
            });
            setMenuData(parsedData);
            setLoading(false);
          }
        });
      } catch (error) {
        console.error("Error fetching menu data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(menuData.map(p => p[lang].category))).filter(Boolean);
    return cats;
  }, [menuData, lang]);

  if (loading) {
    return (
      <section className="relative z-[60] w-full py-32 px-4 md:px-10 bg-black min-h-screen flex items-center justify-center">
        <div className="text-white font-big-noodle text-2xl animate-pulse uppercase">
          {lang === "en" ? "LOADING MENU..." : "მენიუ იტვირთება..."}
        </div>
      </section>
    );
  }

  return (
    <section className="relative z-[60] w-full py-32 px-4 md:px-10 bg-black min-h-screen">
      <div className="max-w-[1440px] mx-auto">
        <div className="flex flex-col items-center mb-20">
          <h2 className="text-4xl md:text-6xl font-big-noodle font-normal tracking-normal text-white mb-12 uppercase">
            {lang === "en" ? "MENU" : "მენიუ"}
          </h2>
          
          {/* Category Navigation */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 mb-8 sticky top-24 z-[70] bg-black/40 backdrop-blur-xl py-4 px-8 rounded-full border border-white/10 shadow-2xl">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => {
                  const element = document.getElementById(`category-${category}`);
                  if (element) {
                    const offset = 150;
                    const bodyRect = document.body.getBoundingClientRect().top;
                    const elementRect = element.getBoundingClientRect().top;
                    const elementPosition = elementRect - bodyRect;
                    const offsetPosition = elementPosition - offset;

                    window.scrollTo({
                      top: offsetPosition,
                      behavior: "smooth"
                    });
                  }
                }}
                className="text-[10px] font-bold tracking-[0.2em] text-white/60 hover:text-[#D4FF00] transition-all duration-300 uppercase whitespace-nowrap"
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-32">
          {categories.map((category) => (
            <div id={`category-${category}`} key={category} className="scroll-mt-32">
              <CategoryCarousel 
                category={category} 
                products={menuData.filter(p => p[lang].category === category)} 
                lang={lang} 
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoryCarousel({ category, products, lang }: { category: string; products: Product[]; lang: "en" | "ka" }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const nextSlide = () => {
    if (currentIndex < products.length - 4) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  return (
    <div className="flex flex-col">
      <h3 className="text-[#D4FF00] font-big-noodle text-3xl md:text-5xl mb-10 uppercase tracking-wider">
        {category}
      </h3>

      <div className="relative group">
        {products.length > 4 && (
          <>
            <button 
              onClick={prevSlide}
              disabled={currentIndex === 0}
              className={`absolute left-[-60px] top-1/2 -translate-y-1/2 z-10 p-2 text-white transition-opacity hidden lg:block ${currentIndex === 0 ? 'opacity-0 pointer-events-none' : 'opacity-40 hover:opacity-100'}`}
            >
              <ChevronLeft size={48} />
            </button>
            <button 
              onClick={nextSlide}
              disabled={currentIndex >= products.length - 4}
              className={`absolute right-[-60px] top-1/2 -translate-y-1/2 z-10 p-2 text-white transition-opacity hidden lg:block ${currentIndex >= products.length - 4 ? 'opacity-0 pointer-events-none' : 'opacity-40 hover:opacity-100'}`}
            >
              <ChevronRight size={48} />
            </button>
          </>
        )}

        <div className="overflow-x-auto lg:overflow-hidden scrollbar-hide pb-4 -mx-4 px-4 md:-mx-10 md:px-10">
          <motion.div 
            ref={containerRef}
            className="flex gap-x-6 md:gap-x-10"
            animate={isDesktop ? { x: `-${currentIndex * (100 / 4)}%` } : { x: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {products.map((product) => (
              <div key={product.id} className="flex-none w-[260px] sm:w-[300px] lg:w-[calc(25%-30px)]">
                <MenuCard product={product} lang={lang} />
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}


function FAQSection({ lang }: { lang: "en" | "ka" }) {
  const [faqData, setFaqData] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugData, setDebugData] = useState<string>("");
  const [showDebug, setShowDebug] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const fetchFaq = async () => {
      try {
        const response = await fetch(FAQ_CSV_URL);
        const csvText = await response.text();
        setDebugData(csvText.slice(0, 500)); // Store first 500 chars for debugging

        if (!response.ok) {
          const statusText = response.statusText || "Unknown Error";
          console.error(`FAQ Fetch HTTP Error: ${response.status} ${statusText}`);
          throw new Error(`Failed to fetch FAQ: ${response.status} ${statusText}`);
        }
        
        const results = Papa.parse(csvText, { header: false, skipEmptyLines: true });
        const data = results.data as any[][];
        
        if (!data || data.length < 1) {
          console.warn("FAQ CSV is empty");
          setLoading(false);
          return;
        }

        // Check if we accidentally fetched the Menu sheet
        const firstRowStr = JSON.stringify(data[0]).toLowerCase();
        if (firstRowStr.includes("category") || firstRowStr.includes("product") || firstRowStr.includes("price")) {
          console.error("Fetched Menu data instead of FAQ data. First row:", firstRowStr);
          setError(`Fetched wrong sheet (Menu). Please ensure the 'FAQ' sheet is published individually or provide its GID.`);
          setLoading(false);
          return;
        }

        if (data.length < 2) {
          setLoading(false);
          return;
        }

        // Find header row (usually the first row with "Question" or "Answer")
        const normalize = (s: string) => s ? s.toString().toLowerCase().replace(/[^a-z0-9]/g, "") : "";
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(data.length, 10); i++) {
          const row = data[i];
          if (row.some(cell => {
            const n = normalize(cell);
            return n.includes("question") || n.includes("quastion") || n.includes("answer");
          })) {
            headerRowIndex = i;
            break;
          }
        }

        // Use indices provided by user: B=1 (Q GEO), C=2 (A GEO), D=3 (Q ENG), E=4 (A ENG)
        let qGeoIdx = 1;
        let aGeoIdx = 2;
        let qEngIdx = 3;
        let aEngIdx = 4;

        // If we found a header row, try to find indices dynamically but fallback to user's indices
        if (headerRowIndex !== -1) {
          const headers = data[headerRowIndex];
          const dynamicQGeo = headers.findIndex(h => normalize(h).includes("question") && (normalize(h).includes("geo") || normalize(h).includes("ka")));
          const dynamicAGeo = headers.findIndex(h => normalize(h).includes("answer") && (normalize(h).includes("geo") || normalize(h).includes("ka")));
          const dynamicQEng = headers.findIndex(h => normalize(h).includes("question") && (normalize(h).includes("eng") || normalize(h).includes("en")));
          const dynamicAEng = headers.findIndex(h => normalize(h).includes("answer") && (normalize(h).includes("eng") || normalize(h).includes("en")));

          // Also check for "quastion" typo
          const typoQGeo = headers.findIndex(h => normalize(h).includes("quastion") && normalize(h).includes("geo"));
          const typoQEng = headers.findIndex(h => normalize(h).includes("quastion") && normalize(h).includes("eng"));

          if (dynamicQGeo !== -1) qGeoIdx = dynamicQGeo;
          else if (typoQGeo !== -1) qGeoIdx = typoQGeo;

          if (dynamicAGeo !== -1) aGeoIdx = dynamicAGeo;
          
          if (dynamicQEng !== -1) qEngIdx = dynamicQEng;
          else if (typoQEng !== -1) qEngIdx = typoQEng;

          if (dynamicAEng !== -1) aEngIdx = dynamicAEng;
        }

        // Data starts after header if found, otherwise from the beginning
        const rows = headerRowIndex !== -1 ? data.slice(headerRowIndex + 1) : data;

        const parsed: FAQItem[] = rows.map((row, idx) => ({
          id: idx.toString(),
          en: {
            question: row[qEngIdx] || "",
            answer: row[aEngIdx] || ""
          },
          ka: {
            question: row[qGeoIdx] || "",
            answer: row[aGeoIdx] || ""
          }
        })).filter(item => (item.en.question && item.en.question.length > 2) || (item.ka.question && item.ka.question.length > 2));

        setFaqData(parsed);
      } catch (err) {
        console.error("FAQ Error:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };
    fetchFaq();
  }, []);

  if (loading) return null;
  
  if (error) {
    return (
      <section className="w-full py-20 px-4 bg-black border-t border-white/5 text-center">
        <div className="max-w-[1000px] mx-auto">
          <p className="text-red-500 font-albert mb-4 uppercase tracking-widest">FAQ Error</p>
          <p className="text-white mb-6">{error}</p>
          
          <button 
            onClick={() => setShowDebug(!showDebug)}
            className="text-xs text-white/30 hover:text-white/60 underline uppercase tracking-tighter"
          >
            {showDebug ? "Hide Debug Info" : "Show Debug Info"}
          </button>

          {showDebug && (
            <div className="mt-8 p-4 bg-white/5 border border-white/10 rounded text-left overflow-auto max-h-60">
              <p className="text-[10px] text-[#D4FF00] mb-2 uppercase font-mono">Raw Data (First 500 chars):</p>
              <pre className="text-[10px] text-white/70 font-mono whitespace-pre-wrap">
                {debugData || "No data received"}
              </pre>
              <p className="text-[10px] text-[#D4FF00] mt-4 mb-2 uppercase font-mono">URL Used:</p>
              <code className="text-[10px] text-white/70 font-mono break-all">
                {FAQ_CSV_URL}
              </code>
            </div>
          )}
        </div>
      </section>
    );
  }

  if (faqData.length === 0) return null;

  return (
    <section className="w-full py-32 px-4 md:px-10 bg-black border-t border-white/5">
      <div className="max-w-[1000px] mx-auto">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl md:text-6xl font-big-noodle font-normal tracking-normal text-white mb-20 uppercase text-center"
        >
          {lang === "en" ? "FREQUENTLY ASKED QUESTIONS" : "ხშირად დასმული კითხვები"}
        </motion.h2>

        <div className="space-y-4">
          {faqData.map((item, idx) => (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="border-b border-white/10 overflow-hidden"
            >
              <button
                onClick={() => setOpenId(openId === item.id ? null : item.id)}
                className="w-full py-6 flex items-center justify-between text-left group"
              >
                <span className={`text-lg md:text-xl font-albert font-bold uppercase tracking-wider transition-colors duration-300 ${openId === item.id ? 'text-[#D4FF00]' : 'text-white group-hover:text-white/80'}`}>
                  {item[lang].question}
                </span>
                <motion.div
                  animate={{ rotate: openId === item.id ? 45 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-[#D4FF00] ml-4 flex-shrink-0"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/>
                  </svg>
                </motion.div>
              </button>
              
              <motion.div
                initial={false}
                animate={{ 
                  height: openId === item.id ? "auto" : 0,
                  opacity: openId === item.id ? 1 : 0
                }}
                transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
              >
                <div className="pb-8 pr-12">
                  <p className="text-white/60 font-albert text-sm md:text-base leading-relaxed tracking-wide uppercase">
                    {item[lang].answer}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LanguageSwitcher({ lang, setLang }: { lang: "en" | "ka"; setLang: (l: "en" | "ka") => void }) {
  return (
    <div className="fixed top-12 left-0 right-0 z-[100] pointer-events-none">
      <div className="max-w-[1440px] mx-auto px-4 md:px-10 flex justify-end">
        <div className="flex items-center gap-4 pointer-events-auto">
          <button 
            onClick={() => setLang("en")}
            className={`text-[10px] font-bold tracking-[0.2em] transition-all duration-300 uppercase ${
              lang === "en" ? "text-[#D4FF00]" : "text-white/40 hover:text-white"
            }`}
          >
            EN
          </button>
          <div className="w-[1px] h-3 bg-white/20" />
          <button 
            onClick={() => setLang("ka")}
            className={`text-[10px] font-bold tracking-[0.2em] transition-all duration-300 uppercase ${
              lang === "ka" ? "text-[#D4FF00]" : "text-white/40 hover:text-white"
            }`}
          >
            KA
          </button>
        </div>
      </div>
    </div>
  );
}

function Footer({ lang }: { lang: "en" | "ka" }) {
  return (
    <footer className="relative z-[60] w-full py-20 px-4 md:px-10 bg-black border-t border-white/5">
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="flex flex-col items-center md:items-start">
          <img 
            src="https://raw.githubusercontent.com/KamaBarTbilisi/Kama-Web-assets/87b07ca5c7cd86f811cf6a7819f166f0d8dc086b/Section%201%20-%20Logo.svg"
            alt="Kama Logo"
            className="h-8 w-auto mb-8 opacity-50"
            referrerPolicy="no-referrer"
          />
          <p className="text-[10px] text-white/40 font-albert tracking-[0.2em] uppercase leading-relaxed text-center md:text-left">
            {lang === "en" 
              ? "KAMA BAR TBILISI. FRESH INGREDIENTS, BOLD FLAVORS. VISIT US FOR A UNIQUE CULINARY EXPERIENCE."
              : "კამა ბარი თბილისი. ახალი ინგრედიენტები, გამორჩეული გემოები. გვეწვიეთ უნიკალური კულინარიული გამოცდილებისთვის."}
          </p>
        </div>

        <div className="flex flex-col items-center">
          <h4 className="text-[#D4FF00] font-big-noodle text-2xl mb-6 uppercase tracking-wider">
            {lang === "en" ? "LOCATION" : "ლოკაცია"}
          </h4>
          <p className="text-[10px] text-white/60 font-albert tracking-[0.2em] uppercase text-center">
            {lang === "en" ? "TBILISI, GEORGIA" : "თბილისი, საქართველო"}
          </p>
        </div>

        <div className="flex flex-col items-center md:items-end">
          <h4 className="text-[#D4FF00] font-big-noodle text-2xl mb-6 uppercase tracking-wider">
            {lang === "en" ? "FOLLOW US" : "მოგვყევით"}
          </h4>
          <div className="flex gap-6">
            <a href="#" className="text-white/40 hover:text-white transition-colors text-[10px] font-bold tracking-[0.2em] uppercase">INSTAGRAM</a>
            <a href="#" className="text-white/40 hover:text-white transition-colors text-[10px] font-bold tracking-[0.2em] uppercase">FACEBOOK</a>
          </div>
        </div>
      </div>
      
      <div className="max-w-[1440px] mx-auto mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-[8px] text-white/20 font-albert tracking-[0.2em] uppercase">
          © 2026 KAMA BAR. ALL RIGHTS RESERVED.
        </p>
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="text-[8px] text-white/20 hover:text-white transition-colors font-albert tracking-[0.2em] uppercase"
        >
          {lang === "en" ? "BACK TO TOP ↑" : "ზემოთ დაბრუნება ↑"}
        </button>
      </div>
    </footer>
  );
}

export default function App() {
  const [lang, setLang] = useState<"en" | "ka">("en");
  const animationRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: animationRef,
    offset: ["start start", "end end"]
  });
  
  // Smooth out the scroll progress
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-red-500/30">
      <LanguageSwitcher lang={lang} setLang={setLang} />
      {/* Background Grid Lines */}
      <div className="fixed inset-0 pointer-events-none opacity-10 z-0 flex justify-center">
        <div className="h-full w-full max-w-[1440px] grid grid-cols-12 divide-x divide-white/20 border-x border-white/20">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="h-full" />
          ))}
        </div>
      </div>

      {/* Fixed 3D Model Container - Top level for absolute reliability */}
      <motion.div 
        className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center overflow-hidden"
      >
        <div className="w-full h-full">
          <Canvas 
            gl={{ alpha: true, antialias: true }}
            dpr={[1, 2]}
          >
            <Suspense fallback={null}>
              <ambientLight intensity={1.5} />
              <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} />
              <pointLight position={[-10, -10, -10]} intensity={1} />
              <Environment preset="city" />
              <AnimatedGroup>
                <KamaModel scrollProgress={smoothProgress} />
              </AnimatedGroup>
            </Suspense>
          </Canvas>
        </div>
      </motion.div>

      {/* Content Overlay */}
      <div className="relative z-10" ref={animationRef}>
        {/* Section 1: Hero & Branding */}
        <main className="flex flex-col items-center pt-12 min-h-screen relative">
          {/* Logo Section */}
          <div className="w-full max-w-[1440px] mx-auto px-4 md:px-10 flex justify-center">
            <motion.header 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-16"
            >
              <img 
                src="https://raw.githubusercontent.com/KamaBarTbilisi/Kama-Web-assets/87b07ca5c7cd86f811cf6a7819f166f0d8dc086b/Section%201%20-%20Logo.svg"
                alt="Kama Logo"
                className="h-12 md:h-16 w-auto"
                referrerPolicy="no-referrer"
              />
            </motion.header>
          </div>

          {/* Hero Image - Constrained to 1440px Grid */}
          <motion.section 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="w-full max-w-[1440px] mx-auto px-4 md:px-10 relative overflow-hidden"
          >
            <div className="w-full relative overflow-hidden">
              <img 
                src="https://raw.githubusercontent.com/KamaBarTbilisi/Kama-Web-assets/87b07ca5c7cd86f811cf6a7819f166f0d8dc086b/Section%201%20-%20Hero%20image.png"
                alt="Kama Hero"
                className="w-full h-auto block"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/10" />
            </div>
          </motion.section>

          {/* Text Blocks Grid */}
          <div className="w-full max-w-[1440px] mx-auto grid grid-cols-2 gap-4 mt-6 px-4 md:px-10">
            {/* Left Block */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col justify-start"
            >
              <div className="max-w-[320px] text-[10px] leading-[1.3] tracking-wider text-white/60 font-medium uppercase">
                <p>SEO TEXT BLOCK LEFT/ SEO TEXT BLOCK LEFT/ SEO TEXT BLOCK LEFT/ SEO TEXT BLOCK LEFT/ SEO TEXT BLOCK LEFT/ SEO TEXT BLOCK LEFT/ SEO TEXT BLOCK LEFT/ SEO TEXT BLOCK LEFT/</p>
              </div>
            </motion.div>

            {/* Right Block */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col justify-start items-end"
            >
              <div className="max-w-[320px] text-[10px] leading-[1.3] tracking-wider text-white/60 font-medium uppercase text-right">
                <p>SEO TEXT BLOCK RIGHT// SEO TEXT BLOCK RIGHT// SEO TEXT BLOCK RIGHT// SEO TEXT BLOCK RIGHT// SEO TEXT BLOCK RIGHT// SEO TEXT BLOCK RIGHT// SEO TEXT BLOCK RIGHT// SEO TEXT BLOCK RIGHT//</p>
              </div>
            </motion.div>
          </div>
        </main>

        {/* Section 2: 300VH Section (3 Viewports) with Background Image and Levitating Assets */}
        <motion.section 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="w-full h-[300vh] mt-32 relative overflow-hidden"
        >
          {/* Background Image (Centered) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <img 
              src="https://raw.githubusercontent.com/KamaBarTbilisi/Kama-Web-assets/87b07ca5c7cd86f811cf6a7819f166f0d8dc086b/Fresh%201.png"
              alt="Decorative Line"
              className="h-full w-auto object-contain opacity-30"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Levitating Assets in Zig-Zag */}
          
          {/* 1. Pumpkin (Left) - 2 phase.png */}
          <motion.div
            animate={{ y: [0, -30, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[15%] left-[5%] md:left-[10%] z-20"
          >
            <img 
              src="https://raw.githubusercontent.com/KamaBarTbilisi/Kama-Web-assets/87b07ca5c7cd86f811cf6a7819f166f0d8dc086b/2%20phase.png"
              alt="Pumpkin"
              className="w-40 md:w-72 h-auto drop-shadow-2xl"
              referrerPolicy="no-referrer"
            />
          </motion.div>

          {/* 2. Tomato (Right) - 1 phase.png */}
          <motion.div
            animate={{ y: [0, -40, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="absolute top-[45%] right-[5%] md:right-[10%] z-20"
          >
            <img 
              src="https://raw.githubusercontent.com/KamaBarTbilisi/Kama-Web-assets/87b07ca5c7cd86f811cf6a7819f166f0d8dc086b/1%20phase.png"
              alt="Tomato"
              className="w-40 md:w-72 h-auto drop-shadow-2xl"
              referrerPolicy="no-referrer"
            />
          </motion.div>

          {/* 3. Mushrooms (Left) - 3 phase.png */}
          <motion.div
            animate={{ y: [0, -25, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute top-[75%] left-[5%] md:left-[15%] z-20"
          >
            <img 
              src="https://raw.githubusercontent.com/KamaBarTbilisi/Kama-Web-assets/87b07ca5c7cd86f811cf6a7819f166f0d8dc086b/3%20phase.png"
              alt="Mushrooms"
              className="w-40 md:w-72 h-auto drop-shadow-2xl"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        </motion.section>
      </div>

      {/* Section 3: Menu Section - Higher z-index to appear above GLB */}
      <div className="relative z-[60]">
        <MenuSection lang={lang} />
        <FAQSection lang={lang} />
        <Footer lang={lang} />
      </div>

      {/* Dimension Label */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="bg-[#007AFF] px-3 py-1 text-[9px] font-bold text-white uppercase tracking-widest rounded-sm shadow-xl">
          1440 GRID
        </div>
      </div>
    </div>
  );
}
