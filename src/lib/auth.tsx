import { createContext, useContext, useState, type ReactNode } from "react";

export interface Doctor {
  id: string;
  name: string;
  email: string;
  clinic: string;
  role: string;
  department: string;
  initials: string;
}

export const DEMO_DOCTORS: Doctor[] = [
  {
    id: "dr-anika",
    name: "Dr. Anika Rao",
    email: "anika.rao@aarogyamithra.demo",
    clinic: "Northstar Care & OPD",
    role: "Consultant Physician",
    department: "General Medicine",
    initials: "AR",
  },
  {
    id: "dr-vikram",
    name: "Dr. Vikram Deshmukh",
    email: "vikram.deshmukh@aarogyamithra.demo",
    clinic: "Apollo Specialty Hospital",
    role: "Senior Consultant",
    department: "Cardiology & Hypertension",
    initials: "VD",
  },
  {
    id: "dr-maya",
    name: "Dr. Maya Shah",
    email: "maya.shah@aarogyamithra.demo",
    clinic: "Manipal Hospital OPD",
    role: "Diabetologist & Endocrinologist",
    department: "Endocrinology",
    initials: "MS",
  },
];

interface AuthContextValue {
  doctor: Doctor | null;
  signIn: (email?: string, password?: string) => void;
  signInAs: (presetId: string) => void;
  register: (profile: Omit<Doctor, "id" | "initials">) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readDoctor(): Doctor | null {
  try {
    const stored =
      localStorage.getItem("aarogya-mithra-doctor") ??
      localStorage.getItem("colossus-doctor");
    return stored ? (JSON.parse(stored) as Doctor) : DEMO_DOCTORS[0];
  } catch {
    return DEMO_DOCTORS[0];
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

  const signIn = (email?: string) => {
    if (email) {
      const match = DEMO_DOCTORS.find(
        (d) => d.email.toLowerCase() === email.toLowerCase(),
      );
      if (match) {
        save(match);
        return;
      }
    }
    save({
      ...DEMO_DOCTORS[0],
      email: email || DEMO_DOCTORS[0].email,
    });
  };

  const signInAs = (presetId: string) => {
    const match = DEMO_DOCTORS.find((d) => d.id === presetId) ?? DEMO_DOCTORS[0];
    save(match);
  };

  const register = (profile: Omit<Doctor, "id" | "initials">) => {
    const initials = profile.name
      .split(" ")
      .filter(Boolean)
      .slice(-2)
      .map((n) => n[0].toUpperCase())
      .join("") || "DR";

    const newDoctor: Doctor = {
      ...profile,
      id: `dr-${Date.now()}`,
      initials,
    };
    save(newDoctor);
  };

  const signOut = () => {
    save(null);
  };

  return (
    <AuthContext.Provider
      value={{ doctor, signIn, signInAs, register, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
