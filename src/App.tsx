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
import { BrowserRouter, Routes, Route, useNavigate, Link } from "react-router-dom";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp,
  getDocs
} from "firebase/firestore";
import { 
  onAuthStateChanged, 
  signOut,
  signInAnonymously
} from "firebase/auth";
import { db, auth } from "./firebase";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  LogOut, 
  Settings,
  ArrowLeft
} from "lucide-react";

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
  category_en: string;
  category_ka: string;
  order?: number;
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
  order?: number;
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
    // Fetch from Firestore
    const q = query(collection(db, "products"), orderBy("order", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setMenuData(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
        setLoading(false);
      } else {
        // Fallback to Google Sheets if Firestore is empty
        fetchFromSheets();
      }
    }, (error) => {
      console.error("Firestore error:", error);
      fetchFromSheets();
    });

    const fetchFromSheets = async () => {
      try {
        const response = await fetch(MENU_CSV_URL);
        const csvText = await response.text();
        
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim(),
          complete: (results) => {
            const parsedData: Product[] = results.data.map((row: any, index: number) => {
              const getVal = (keys: string[]) => {
                const foundKey = Object.keys(row).find(k => keys.includes(k.trim()));
                return foundKey ? row[foundKey] : "";
              };

              const parseDescription = (val: string) => {
                if (!val) return [];
                return val.split(",").map((s: string) => s.trim()).filter(Boolean);
              };

              return {
                id: `sheet-${index}`,
                image: getRawGithubUrl(getVal(["Image Link"])),
                category_en: getVal(["Category ENG"]),
                category_ka: getVal(["Category GEO"]),
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

    return () => unsubscribe();
  }, []);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(menuData.map(p => p[lang === 'en' ? 'category_en' : 'category_ka']))).filter(Boolean);
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
  const [openId, setOpenId] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [debugData, setDebugData] = useState<string>("");

  useEffect(() => {
    const q = query(collection(db, "faqs"), orderBy("order", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setFaqData(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FAQItem)));
        setLoading(false);
      } else {
        fetchFromSheets();
      }
    }, (error) => {
      console.error("FAQ Firestore error:", error);
      fetchFromSheets();
    });

    const fetchFromSheets = async () => {
      try {
        const response = await fetch(FAQ_CSV_URL);
        const csvText = await response.text();
        
        const results = Papa.parse(csvText, { header: false, skipEmptyLines: true });
        const data = results.data as any[][];
        
        if (!data || data.length < 2) {
          setLoading(false);
          return;
        }

        const rows = data.slice(1); // Skip header

        const parsed: FAQItem[] = rows.map((row, idx) => ({
          id: `sheet-${idx}`,
          en: {
            question: row[3] || "",
            answer: row[4] || ""
          },
          ka: {
            question: row[1] || "",
            answer: row[2] || ""
          }
        })).filter(item => item.en.question || item.ka.question);

        setFaqData(parsed);
      } catch (err) {
        console.error("FAQ Error:", err);
      } finally {
        setLoading(false);
      }
    };

    return () => unsubscribe();
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

function AdminDashboard({ lang }: { lang: "en" | "ka" }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [activeTab, setActiveTab] = useState<"products" | "faqs">("products");
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [editingFaq, setEditingFaq] = useState<Partial<FAQItem> | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const navigate = useNavigate();

  const syncFromSheets = async () => {
    if (!window.confirm("This will import data from Google Sheets into Firestore. Continue?")) return;
    setIsSyncing(true);
    try {
      if (activeTab === "products") {
        const response = await fetch(MENU_CSV_URL);
        const csvText = await response.text();
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: async (results) => {
            for (const row of results.data as any[]) {
              const parseDescription = (val: string) => val ? val.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
              await addDoc(collection(db, "products"), {
                image: getRawGithubUrl(row["Image Link"]),
                category_en: row["Category ENG"],
                category_ka: row["Category GEO"],
                order: products.length,
                en: {
                  name: row["Product name ENG"] || row["Product Name ENG"],
                  description: parseDescription(row["Description ENG"]),
                  nutrition: row["Nutriotion ENG"] || row["Nutrition ENG"],
                  category: row["Category ENG"]
                },
                ka: {
                  name: row["Product name GEO"] || row["Product Name GEO"],
                  description: parseDescription(row["Description GEO"]),
                  nutrition: row["Nutriotion GEO"] || row["Nutrition GEO"],
                  category: row["Category GEO"]
                },
                createdAt: serverTimestamp()
              });
            }
            alert("Products synced!");
            setIsSyncing(false);
          }
        });
      } else {
        const response = await fetch(FAQ_CSV_URL);
        const csvText = await response.text();
        Papa.parse(csvText, {
          header: false,
          skipEmptyLines: true,
          complete: async (results) => {
            const rows = (results.data as any[]).slice(1);
            for (const row of rows) {
              await addDoc(collection(db, "faqs"), {
                order: faqs.length,
                en: { question: row[3] || "", answer: row[4] || "" },
                ka: { question: row[1] || "", answer: row[2] || "" }
              });
            }
            alert("FAQs synced!");
            setIsSyncing(false);
          }
        });
      }
    } catch (error) {
      console.error("Sync error:", error);
      alert("Sync failed. Check console.");
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const savedSession = localStorage.getItem("admin_session");
    if (savedSession === "Kama1233") {
      setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      const qProducts = query(collection(db, "products"), orderBy("order", "asc"));
      const unsubProducts = onSnapshot(qProducts, (snapshot) => {
        setProducts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      });

      const qFaqs = query(collection(db, "faqs"), orderBy("order", "asc"));
      const unsubFaqs = onSnapshot(qFaqs, (snapshot) => {
        setFaqs(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FAQItem)));
      });

      return () => {
        unsubProducts();
        unsubFaqs();
      };
    }
  }, [isLoggedIn]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "Kama1233") {
      localStorage.setItem("admin_session", "Kama1233");
      setIsLoggedIn(true);
    } else {
      alert("Incorrect password");
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      if (editingProduct.id) {
        const { id, ...data } = editingProduct;
        await updateDoc(doc(db, "products", id), data);
      } else {
        await addDoc(collection(db, "products"), {
          ...editingProduct,
          order: products.length,
          createdAt: serverTimestamp()
        });
      }
      setEditingProduct(null);
    } catch (error) {
      console.error("Save error:", error);
      alert("Error saving product. Check console.");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm("Delete this product?")) {
      await deleteDoc(doc(db, "products", id));
    }
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFaq) return;

    try {
      if (editingFaq.id) {
        const { id, ...data } = editingFaq;
        await updateDoc(doc(db, "faqs", id), data);
      } else {
        await addDoc(collection(db, "faqs"), {
          ...editingFaq,
          order: faqs.length
        });
      }
      setEditingFaq(null);
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-zinc-900 p-8 rounded-2xl border border-white/10 w-full max-w-md">
          <h2 className="text-2xl font-big-noodle text-white mb-6 uppercase tracking-widest text-center">ADMIN LOGIN</h2>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter Password"
            className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white mb-4 focus:border-[#D4FF00] outline-none"
          />
          <button type="submit" className="w-full bg-[#D4FF00] text-black font-bold py-3 rounded-lg hover:bg-[#b8dd00] transition-colors uppercase tracking-widest">
            ENTER
          </button>
          <Link to="/" className="block text-center text-white/40 text-[10px] mt-6 uppercase tracking-widest hover:text-white">BACK TO SITE</Link>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-10">
      <div className="max-w-[1440px] mx-auto">
        <div className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-6">
            <button onClick={() => navigate("/")} className="text-white/40 hover:text-white transition-colors">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-3xl md:text-5xl font-big-noodle uppercase tracking-widest">CMS DASHBOARD</h1>
          </div>
          <div className="flex items-center gap-6">
            <button 
              onClick={() => {
                localStorage.removeItem("admin_session");
                setIsLoggedIn(false);
              }} 
              className="text-red-500 hover:text-red-400 transition-colors"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 border-b border-white/10">
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveTab("products")}
              className={`pb-4 px-4 text-xs font-bold tracking-[0.2em] uppercase transition-colors ${activeTab === "products" ? "text-[#D4FF00] border-b-2 border-[#D4FF00]" : "text-white/40 hover:text-white"}`}
            >
              PRODUCTS
            </button>
            <button 
              onClick={() => setActiveTab("faqs")}
              className={`pb-4 px-4 text-xs font-bold tracking-[0.2em] uppercase transition-colors ${activeTab === "faqs" ? "text-[#D4FF00] border-b-2 border-[#D4FF00]" : "text-white/40 hover:text-white"}`}
            >
              FAQ
            </button>
          </div>
          <button 
            onClick={syncFromSheets}
            disabled={isSyncing}
            className="pb-4 px-4 text-[10px] font-bold tracking-[0.2em] uppercase text-white/20 hover:text-[#D4FF00] transition-colors disabled:opacity-50"
          >
            {isSyncing ? "SYNCING..." : "SYNC FROM SHEETS"}
          </button>
        </div>

        {activeTab === "products" ? (
          <div className="space-y-8">
            <div className="flex justify-end">
              <button 
                onClick={() => setEditingProduct({
                  en: { name: "", description: [], nutrition: "", category: "" },
                  ka: { name: "", description: [], nutrition: "", category: "" },
                  image: "",
                  category_en: "",
                  category_ka: ""
                })}
                className="bg-[#D4FF00] text-black px-6 py-2 rounded-full font-bold text-[10px] tracking-widest uppercase flex items-center gap-2 hover:bg-[#b8dd00] transition-colors"
              >
                <Plus size={14} /> ADD PRODUCT
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map(p => (
                <div key={p.id} className="bg-zinc-900 rounded-2xl border border-white/10 overflow-hidden group">
                  <div className="aspect-square relative">
                    <img src={p.image} className="w-full h-full object-cover" alt={p.en.name} />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                      <button onClick={() => setEditingProduct(p)} className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform"><Edit2 size={18} /></button>
                      <button onClick={() => handleDeleteProduct(p.id)} className="p-3 bg-red-500 text-white rounded-full hover:scale-110 transition-transform"><Trash2 size={18} /></button>
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="text-sm font-bold uppercase tracking-widest mb-1">{p.en.name}</h4>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest">{p.category_en}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex justify-end">
              <button 
                onClick={() => setEditingFaq({
                  en: { question: "", answer: "" },
                  ka: { question: "", answer: "" }
                })}
                className="bg-[#D4FF00] text-black px-6 py-2 rounded-full font-bold text-[10px] tracking-widest uppercase flex items-center gap-2 hover:bg-[#b8dd00] transition-colors"
              >
                <Plus size={14} /> ADD FAQ
              </button>
            </div>

            <div className="space-y-4">
              {faqs.map(f => (
                <div key={f.id} className="bg-zinc-900 p-6 rounded-2xl border border-white/10 flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-widest mb-2">{f.en.question}</h4>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest line-clamp-1">{f.en.answer}</p>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => setEditingFaq(f)} className="text-white/40 hover:text-[#D4FF00] transition-colors"><Edit2 size={18} /></button>
                    <button onClick={async () => { if(window.confirm("Delete?")) await deleteDoc(doc(db, "faqs", f.id)) }} className="text-white/40 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Product Modal */}
        {editingProduct && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 p-8">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-big-noodle uppercase tracking-widest">{editingProduct.id ? "EDIT PRODUCT" : "NEW PRODUCT"}</h3>
                <button onClick={() => setEditingProduct(null)} className="text-white/40 hover:text-white"><X size={24} /></button>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* English */}
                  <div className="space-y-4">
                    <p className="text-[10px] text-[#D4FF00] font-bold uppercase tracking-widest">ENGLISH DETAILS</p>
                    <input 
                      placeholder="Product Name"
                      value={editingProduct.en?.name}
                      onChange={e => setEditingProduct({...editingProduct, en: {...editingProduct.en!, name: e.target.value}})}
                      className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#D4FF00]"
                      required
                    />
                    <input 
                      placeholder="Category"
                      value={editingProduct.category_en}
                      onChange={e => setEditingProduct({...editingProduct, category_en: e.target.value})}
                      className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#D4FF00]"
                      required
                    />
                    <textarea 
                      placeholder="Description (comma separated)"
                      value={editingProduct.en?.description?.join(", ")}
                      onChange={e => setEditingProduct({...editingProduct, en: {...editingProduct.en!, description: e.target.value.split(",").map(s => s.trim())}})}
                      className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#D4FF00] h-32"
                    />
                    <input 
                      placeholder="Nutrition"
                      value={editingProduct.en?.nutrition}
                      onChange={e => setEditingProduct({...editingProduct, en: {...editingProduct.en!, nutrition: e.target.value}})}
                      className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#D4FF00]"
                    />
                  </div>

                  {/* Georgian */}
                  <div className="space-y-4">
                    <p className="text-[10px] text-[#D4FF00] font-bold uppercase tracking-widest">GEORGIAN DETAILS</p>
                    <input 
                      placeholder="პროდუქტის სახელი"
                      value={editingProduct.ka?.name}
                      onChange={e => setEditingProduct({...editingProduct, ka: {...editingProduct.ka!, name: e.target.value}})}
                      className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#D4FF00]"
                      required
                    />
                    <input 
                      placeholder="კატეგორია"
                      value={editingProduct.category_ka}
                      onChange={e => setEditingProduct({...editingProduct, category_ka: e.target.value})}
                      className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#D4FF00]"
                      required
                    />
                    <textarea 
                      placeholder="აღწერა (მძიმით გამოყოფილი)"
                      value={editingProduct.ka?.description?.join(", ")}
                      onChange={e => setEditingProduct({...editingProduct, ka: {...editingProduct.ka!, description: e.target.value.split(",").map(s => s.trim())}})}
                      className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#D4FF00] h-32"
                    />
                    <input 
                      placeholder="კვებითი ღირებულება"
                      value={editingProduct.ka?.nutrition}
                      onChange={e => setEditingProduct({...editingProduct, ka: {...editingProduct.ka!, nutrition: e.target.value}})}
                      className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#D4FF00]"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] text-[#D4FF00] font-bold uppercase tracking-widest">MEDIA</p>
                  <input 
                    placeholder="Image URL"
                    value={editingProduct.image}
                    onChange={e => setEditingProduct({...editingProduct, image: e.target.value})}
                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#D4FF00]"
                    required
                  />
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <button type="button" onClick={() => setEditingProduct(null)} className="px-8 py-3 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white">CANCEL</button>
                  <button type="submit" className="bg-[#D4FF00] text-black px-12 py-3 rounded-full font-bold text-xs tracking-widest uppercase hover:bg-[#b8dd00] transition-colors">SAVE PRODUCT</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* FAQ Modal */}
        {editingFaq && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 w-full max-w-2xl rounded-3xl border border-white/10 p-8">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-big-noodle uppercase tracking-widest">{editingFaq.id ? "EDIT FAQ" : "NEW FAQ"}</h3>
                <button onClick={() => setEditingFaq(null)} className="text-white/40 hover:text-white"><X size={24} /></button>
              </div>

              <form onSubmit={handleSaveFaq} className="space-y-6">
                <div className="space-y-4">
                  <p className="text-[10px] text-[#D4FF00] font-bold uppercase tracking-widest">ENGLISH</p>
                  <input 
                    placeholder="Question"
                    value={editingFaq.en?.question}
                    onChange={e => setEditingFaq({...editingFaq, en: {...editingFaq.en!, question: e.target.value}})}
                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#D4FF00]"
                    required
                  />
                  <textarea 
                    placeholder="Answer"
                    value={editingFaq.en?.answer}
                    onChange={e => setEditingFaq({...editingFaq, en: {...editingFaq.en!, answer: e.target.value}})}
                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#D4FF00] h-24"
                    required
                  />
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] text-[#D4FF00] font-bold uppercase tracking-widest">GEORGIAN</p>
                  <input 
                    placeholder="კითხვა"
                    value={editingFaq.ka?.question}
                    onChange={e => setEditingFaq({...editingFaq, ka: {...editingFaq.ka!, question: e.target.value}})}
                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#D4FF00]"
                    required
                  />
                  <textarea 
                    placeholder="პასუხი"
                    value={editingFaq.ka?.answer}
                    onChange={e => setEditingFaq({...editingFaq, ka: {...editingFaq.ka!, answer: e.target.value}})}
                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#D4FF00] h-24"
                    required
                  />
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <button type="button" onClick={() => setEditingFaq(null)} className="px-8 py-3 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white">CANCEL</button>
                  <button type="submit" className="bg-[#D4FF00] text-black px-12 py-3 rounded-full font-bold text-xs tracking-widest uppercase hover:bg-[#b8dd00] transition-colors">SAVE FAQ</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LanguageSwitcher({ lang, setLang }: { lang: "en" | "ka"; setLang: (l: "en" | "ka") => void }) {
  return (
    <div className="fixed top-6 right-6 z-[100] flex gap-2">
      <button 
        onClick={() => setLang("en")}
        className={`px-3 py-1 text-[10px] font-bold tracking-widest uppercase transition-all duration-300 rounded-sm border ${lang === "en" ? "bg-[#D4FF00] text-black border-[#D4FF00]" : "text-white/40 border-white/10 hover:text-white"}`}
      >
        EN
      </button>
      <button 
        onClick={() => setLang("ka")}
        className={`px-3 py-1 text-[10px] font-bold tracking-widest uppercase transition-all duration-300 rounded-sm border ${lang === "ka" ? "bg-[#D4FF00] text-black border-[#D4FF00]" : "text-white/40 border-white/10 hover:text-white"}`}
      >
        GE
      </button>
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

function MainApp({ lang, setLang }: { lang: "en" | "ka"; setLang: (l: "en" | "ka") => void }) {
  const animationRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: animationRef,
    offset: ["start start", "end end"]
  });
  
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

      {/* Fixed 3D Model Container */}
      <motion.div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center overflow-hidden">
        <div className="w-full h-full">
          <Canvas gl={{ alpha: true, antialias: true }} dpr={[1, 2]}>
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
        <main className="flex flex-col items-center pt-12 min-h-screen relative">
          <div className="w-full max-w-[1440px] mx-auto px-4 md:px-10 flex justify-between items-center">
            <Link to="/admin" className="text-[10px] text-white/20 hover:text-white transition-colors uppercase tracking-widest">
              <Settings size={16} />
            </Link>
            <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
              <img 
                src="https://raw.githubusercontent.com/KamaBarTbilisi/Kama-Web-assets/87b07ca5c7cd86f811cf6a7819f166f0d8dc086b/Section%201%20-%20Logo.svg"
                alt="Kama Logo"
                className="h-12 md:h-16 w-auto"
                referrerPolicy="no-referrer"
              />
            </motion.header>
            <div className="w-8" /> {/* Spacer */}
          </div>

          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.8 }} className="w-full max-w-[1440px] mx-auto px-4 md:px-10 relative overflow-hidden">
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

          <div className="w-full max-w-[1440px] mx-auto grid grid-cols-2 gap-4 mt-6 px-4 md:px-10">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="flex flex-col justify-start">
              <div className="max-w-[320px] text-[10px] leading-[1.3] tracking-wider text-white/60 font-medium uppercase">
                <p>SEO TEXT BLOCK LEFT/ SEO TEXT BLOCK LEFT/ SEO TEXT BLOCK LEFT/ SEO TEXT BLOCK LEFT/ SEO TEXT BLOCK LEFT/ SEO TEXT BLOCK LEFT/ SEO TEXT BLOCK LEFT/ SEO TEXT BLOCK LEFT/</p>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="flex flex-col justify-start items-end">
              <div className="max-w-[320px] text-[10px] leading-[1.3] tracking-wider text-white/60 font-medium uppercase text-right">
                <p>SEO TEXT BLOCK RIGHT// SEO TEXT BLOCK RIGHT// SEO TEXT BLOCK RIGHT// SEO TEXT BLOCK RIGHT// SEO TEXT BLOCK RIGHT// SEO TEXT BLOCK RIGHT// SEO TEXT BLOCK RIGHT// SEO TEXT BLOCK RIGHT//</p>
              </div>
            </motion.div>
          </div>
        </main>

        <motion.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="w-full h-[300vh] mt-32 relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <img 
              src="https://raw.githubusercontent.com/KamaBarTbilisi/Kama-Web-assets/87b07ca5c7cd86f811cf6a7819f166f0d8dc086b/Fresh%201.png"
              alt="Decorative Line"
              className="h-full w-auto object-contain opacity-30"
              referrerPolicy="no-referrer"
            />
          </div>
          <motion.div animate={{ y: [0, -30, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[15%] left-[5%] md:left-[10%] z-20">
            <img src="https://raw.githubusercontent.com/KamaBarTbilisi/Kama-Web-assets/87b07ca5c7cd86f811cf6a7819f166f0d8dc086b/2%20phase.png" alt="Pumpkin" className="w-40 md:w-72 h-auto drop-shadow-2xl" referrerPolicy="no-referrer" />
          </motion.div>
          <motion.div animate={{ y: [0, -40, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} className="absolute top-[45%] right-[5%] md:right-[10%] z-20">
            <img src="https://raw.githubusercontent.com/KamaBarTbilisi/Kama-Web-assets/87b07ca5c7cd86f811cf6a7819f166f0d8dc086b/1%20phase.png" alt="Tomato" className="w-40 md:w-72 h-auto drop-shadow-2xl" referrerPolicy="no-referrer" />
          </motion.div>
          <motion.div animate={{ y: [0, -25, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute top-[75%] left-[5%] md:left-[15%] z-20">
            <img src="https://raw.githubusercontent.com/KamaBarTbilisi/Kama-Web-assets/87b07ca5c7cd86f811cf6a7819f166f0d8dc086b/3%20phase.png" alt="Mushrooms" className="w-40 md:w-72 h-auto drop-shadow-2xl" referrerPolicy="no-referrer" />
          </motion.div>
        </motion.section>
      </div>

      <div className="relative z-[60]">
        <MenuSection lang={lang} />
        <FAQSection lang={lang} />
        <Footer lang={lang} />
      </div>

      <div className="fixed bottom-6 right-6 z-50">
        <div className="bg-[#007AFF] px-3 py-1 text-[9px] font-bold text-white uppercase tracking-widest rounded-sm shadow-xl">
          1440 GRID
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [lang, setLang] = useState<"en" | "ka">("en");

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainApp lang={lang} setLang={setLang} />} />
        <Route path="/admin" element={<AdminDashboard lang={lang} />} />
      </Routes>
    </BrowserRouter>
  );
}
