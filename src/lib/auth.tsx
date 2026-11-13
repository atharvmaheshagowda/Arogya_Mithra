import { createContext, useContext, useState, type ReactNode } from "react";

export interface Doctor { name: string; email: string; clinic: string; role: string; }
interface AuthContextValue { doctor: Doctor | null; signIn: (email: string) => void; register: (doctor: Doctor) => void; signOut: () => void; }
const AuthContext = createContext<AuthContextValue | null>(null);
const demoDoctor: Doctor = { name: "Dr. Anika Rao", email: "anika.rao@aarogyamithra.demo", clinic: "Northstar Clinic", role: "Consultant Physician" };

function readDoctor(): Doctor | null {
  try {
    const stored = localStorage.getItem("aarogya-mithra-doctor") ?? localStorage.getItem("colossus-doctor");
    return stored ? (JSON.parse(stored) as Doctor) : null;
  } catch {
    return null;
  }
}
export function AuthProvider({ children }: { children: ReactNode }) {
  const [doctor, setDoctor] = useState<Doctor | null>(readDoctor);
  const save = (next: Doctor | null) => {
    setDoctor(next);
    if (next) {
      localStorage.setItem("aarogya-mithra-doctor", JSON.stringify(next));
    } else {
      localStorage.removeItem("aarogya-mithra-doctor");
      localStorage.removeItem("colossus-doctor");
    }
  };
  return <AuthContext.Provider value={{ doctor, signIn: (email) => save({ ...demoDoctor, email: email || demoDoctor.email }), register: save, signOut: () => save(null) }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error("useAuth must be used within AuthProvider"); return context; }
