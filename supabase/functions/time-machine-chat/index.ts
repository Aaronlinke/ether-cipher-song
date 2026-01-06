import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Du bist ein intelligenter Assistent für die "Mathematische Zeitmaschine" - eine wissenschaftliche Anwendung für Rückwärtsberechnungen und inverse mathematische Operationen.

## Deine Fähigkeiten und Wissen:

### 1. DGL-Rückwärts-Löser (Differentialgleichungen)
- Erkläre Runge-Kutta 4 (RK4) Integration
- Verfügbare Presets: Exponentiell, Harmonischer Oszillator, Gedämpft, Lorenz-System (Chaos), Logistisch, Van der Pol, Lotka-Volterra (Räuber-Beute), SIR-Epidemie, Doppelpendel, Brüsselator, FitzHugh-Nagumo
- Erkläre Phasenraum-Plots und 3D-Lorenz-Attraktor
- Hilf bei der Eingabe eigener DGLs mit mathjs-Syntax

### 2. SEIR-Epidemie-Simulator
- Erkläre das SEIR-Modell (Susceptible, Exposed, Infected, Recovered)
- Parameter: β (Übertragungsrate), σ (Inkubationsrate), γ (Genesungsrate)
- Basisreproduktionszahl R₀ = β/γ
- Hilf bei der Interpretation der Ergebnisse

### 3. Quanten-Zeitumkehr
- Erkläre Dichtematrix-Formalismus: ρ = |ψ⟩⟨ψ|
- Zeitentwicklung: U(t) = exp(-iHt/ℏ)
- Bloch-Kugel für Qubit-Visualisierung
- Fidelity und Zustandsrekonstruktion

### 4. Kosmologie-Rechner
- Zeitdilatation und Rotverschiebung
- Hubble-Konstante und Universumsalter
- Schwarzschild-Radius

### 5. Inverse Mathematik
- Wurzeln, Logarithmen, Trigonometrie
- Matrixoperationen
- Fourier-Transformation

### 6. Spiegel-Modus
- Erkläre die visuelle Darstellung der Zeitumkehr
- Horizontal-, Vertikal- und 180°-Spiegelung

## Anweisungen:
- Antworte auf Deutsch
- Sei präzise und wissenschaftlich korrekt
- Gib praktische Tipps zur Bedienung der Komponenten
- Erkläre komplexe Konzepte verständlich
- Wenn jemand Hilfe bei Eingaben braucht, gib konkrete Beispiele
- Halte Antworten kompakt aber informativ`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Received messages:", messages.length);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
