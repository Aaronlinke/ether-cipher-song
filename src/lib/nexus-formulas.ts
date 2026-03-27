// Nexus Mathematics Explorer — Complete Formula Dataset v2.0
// 15 Categories, 85+ Formulas

export interface FormulaVariable {
  symbol: string;
  description: string;
}

export interface Formula {
  id: string;
  name: string;
  latex: string;
  alternativeForms?: string[];
  description: string;
  variables: Record<string, string>;
  properties?: string[];
  origin?: string;
  applications?: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface FormulaCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  formulas: Formula[];
}

export const NEXUS_CATEGORIES: FormulaCategory[] = [
  // ═══════════════════════════════════════════
  // 1. INFORMATIONSTHEORIE
  // ═══════════════════════════════════════════
  {
    id: 'information-theory',
    name: 'Informationstheorie',
    icon: 'Binary',
    color: '#3B82F6',
    description: 'Mathematische Grundlagen der Informationsübertragung, -kompression und -sicherheit (Shannon 1948).',
    formulas: [
      {
        id: 'shannon-entropy',
        name: 'Shannon-Entropie',
        latex: 'H(X) = -\\sum_{i=1}^{n} p(x_i) \\log_2 p(x_i)',
        alternativeForms: ['H(X) = \\mathbb{E}[-\\log_2 p(X)]'],
        description: 'Quantifiziert die durchschnittliche Informationsmenge einer diskreten Zufallsvariable. Maximale Entropie bei Gleichverteilung.',
        variables: { 'H(X)': 'Shannon-Entropie', 'p(x_i)': 'Wahrscheinlichkeit des i-ten Ereignisses', 'n': 'Anzahl möglicher Ereignisse' },
        properties: ['H(X) ≥ 0', 'H(X) ≤ log₂(n)', 'H(X,Y) ≤ H(X) + H(Y)'],
        origin: 'Claude Shannon, 1948',
        applications: ['Datenkompression', 'Kryptographie', 'Statistische Mechanik'],
        difficulty: 'intermediate',
      },
      {
        id: 'mutual-information',
        name: 'Gegenseitige Information',
        latex: 'I(X;Y) = \\sum_{x,y} p(x,y) \\log_2 \\frac{p(x,y)}{p(x)p(y)}',
        description: 'Misst die statistische Abhängigkeit zwischen zwei Zufallsvariablen.',
        variables: { 'I(X;Y)': 'Gegenseitige Information', 'p(x,y)': 'Gemeinsame Verteilung', 'H(X|Y)': 'Bedingte Entropie' },
        properties: ['I(X;Y) = I(Y;X)', 'I(X;Y) ≥ 0', 'I(X;Y) = 0 ⟺ X,Y unabhängig'],
        applications: ['Feature Selection', 'Kanalkapazität', 'Maschinelles Lernen'],
        difficulty: 'advanced',
      },
      {
        id: 'channel-capacity',
        name: 'Kanalkapazität (Shannon-Hartley)',
        latex: 'C = B \\cdot \\log_2\\left(1 + \\frac{S}{N}\\right)',
        description: 'Theoretische Obergrenze der Übertragungsrate über einen AWGN-Kanal.',
        variables: { 'C': 'Kanalkapazität (bps)', 'B': 'Bandbreite (Hz)', 'S/N': 'Signal-Rausch-Verhältnis' },
        origin: 'Shannon 1948, Hartley 1928',
        applications: ['5G/6G', 'WiFi', 'Satellitenkommunikation'],
        difficulty: 'intermediate',
      },
      {
        id: 'kullback-leibler',
        name: 'Kullback-Leibler-Divergenz',
        latex: 'D_{KL}(P \\| Q) = \\sum_{x} p(x) \\log \\frac{p(x)}{q(x)}',
        description: 'Nicht-symmetrisches Maß für die Unterschiedlichkeit zweier Verteilungen. Auch relative Entropie genannt.',
        variables: { 'D_{KL}': 'KL-Divergenz', 'P': 'Wahre Verteilung', 'Q': 'Approximierende Verteilung' },
        properties: ['D_KL ≥ 0 (Gibbs)', 'D_KL = 0 ⟺ P = Q', 'Nicht symmetrisch'],
        applications: ['Variational Inference', 'Informationsgeometrie', 'Anomalieerkennung'],
        difficulty: 'advanced',
      },
      {
        id: 'rate-distortion',
        name: 'Raten-Verzerrungs-Theorie',
        latex: 'R(D) = \\min_{p(\\hat{x}|x): \\mathbb{E}[d(X,\\hat{X})] \\leq D} I(X;\\hat{X})',
        description: 'Minimale Bitrate für verlustbehaftete Kompression mit maximaler Verzerrung D.',
        variables: { 'R(D)': 'Raten-Verzerrungs-Funktion', 'D': 'Erlaubte Verzerrung', 'd': 'Verzerrungsmaß' },
        applications: ['JPEG', 'MP3', 'Video-Kodierung'],
        difficulty: 'expert',
      },
      {
        id: 'min-entropy',
        name: 'Min-Entropie',
        latex: 'H_{\\infty}(X) = -\\log_2 \\max_x p(x)',
        description: 'Konservativste Entropie-Messung, basierend auf dem wahrscheinlichsten Ergebnis.',
        variables: { 'H_∞': 'Min-Entropie', 'p(x)': 'Wahrscheinlichkeit des wahrscheinlichsten Ergebnisses' },
        applications: ['Kryptographische Schlüsselgenerierung', 'Zufallszahlengeneratoren'],
        difficulty: 'advanced',
      },
    ],
  },

  // ═══════════════════════════════════════════
  // 2. CHAOSTHEORIE
  // ═══════════════════════════════════════════
  {
    id: 'chaos',
    name: 'Chaostheorie & Dynamische Systeme',
    icon: 'Flame',
    color: '#EF4444',
    description: 'Nichtlineare Dynamik, deterministisches Chaos und komplexe Systeme.',
    formulas: [
      {
        id: 'logistic-map',
        name: 'Logistische Abbildung',
        latex: 'x_{n+1} = r \\cdot x_n (1 - x_n)',
        description: 'Paradigmatisches Beispiel für deterministisches Chaos. Zeigt Periodenverdopplungskaskaden bei r ≈ 3.57.',
        variables: { 'x_n': 'Populationsdichte ∈ [0,1]', 'r': 'Kontrollparameter (Reproduktionsrate)' },
        properties: ['r=3: Erste Periodenverdopplung', 'r≈3.57: Beginn des Chaos', 'r=4: Vollständiges Chaos'],
        difficulty: 'intermediate',
      },
      {
        id: 'lyapunov-exponent',
        name: 'Lyapunov-Exponent',
        latex: '\\lambda = \\lim_{n \\to \\infty} \\frac{1}{n} \\sum_{i=0}^{n-1} \\ln |f\'(x_i)|',
        description: 'Misst die exponentielle Divergenz benachbarter Trajektorien. λ > 0 impliziert Chaos.',
        variables: { 'λ': 'Maximaler Lyapunov-Exponent', "f'": 'Ableitung der Abbildung' },
        properties: ['λ < 0: Stabile Fixpunkte', 'λ = 0: Bifurkation', 'λ > 0: Chaos'],
        difficulty: 'advanced',
      },
      {
        id: 'lorenz-system',
        name: 'Lorenz-System',
        latex: '\\dot{x} = \\sigma(y-x), \\quad \\dot{y} = x(\\rho-z)-y, \\quad \\dot{z} = xy-\\beta z',
        description: 'System dreier gekoppelter ODEs, das den Lorenz-Attraktor erzeugt. Fraktale Dimension ≈ 2.06.',
        variables: { 'σ': 'Prandtl-Zahl (≈10)', 'ρ': 'Rayleigh-Zahl (≈28)', 'β': 'Geometrischer Aspekt (≈8/3)' },
        applications: ['Wettervorhersage', 'Kryptographie', 'Fluiddynamik'],
        difficulty: 'advanced',
      },
      {
        id: 'feigenbaum-constant',
        name: 'Feigenbaum-Konstante',
        latex: '\\delta = \\lim_{n \\to \\infty} \\frac{a_{n-1} - a_{n-2}}{a_n - a_{n-1}} \\approx 4.6692',
        description: 'Universelle Konstante der Periodenverdopplungen — fundamental wie π und e.',
        variables: { 'a_n': 'Parameterwert der n-ten Bifurkation', 'δ': 'Feigenbaum-Konstante' },
        difficulty: 'expert',
      },
      {
        id: 'henon-map',
        name: 'Hénon-Abbildung',
        latex: 'x_{n+1} = 1 - ax_n^2 + y_n, \\quad y_{n+1} = bx_n',
        description: 'Zweidimensionale dissipative Abbildung mit Strange Attractor.',
        variables: { 'a': 'Nichtlinearität (≈1.4)', 'b': 'Dissipation (≈0.3)' },
        difficulty: 'intermediate',
      },
      {
        id: 'mandelbrot-set',
        name: 'Mandelbrot-Menge',
        latex: 'z_{n+1} = z_n^2 + c, \\quad z_0 = 0',
        description: 'Die ikonische fraktale Menge aller c ∈ ℂ, für die die Iteration beschränkt bleibt.',
        variables: { 'z_n': 'Komplexe Iteration', 'c': 'Komplexer Parameter' },
        properties: ['Zusammenhängend', 'Selbstähnlich an jedem Rand', 'Hausdorff-Dim = 2'],
        difficulty: 'intermediate',
      },
    ],
  },

  // ═══════════════════════════════════════════
  // 3. QUANTENMECHANIK
  // ═══════════════════════════════════════════
  {
    id: 'quantum-mechanics',
    name: 'Quantenmechanik',
    icon: 'Atom',
    color: '#8B5CF6',
    description: 'Mathematische Fundamente der Quantentheorie und Quanteninformation.',
    formulas: [
      {
        id: 'schrodinger-equation',
        name: 'Schrödinger-Gleichung',
        latex: 'i\\hbar \\frac{\\partial}{\\partial t} |\\psi(t)\\rangle = \\hat{H} |\\psi(t)\\rangle',
        description: 'Fundamentale Bewegungsgleichung der Quantenmechanik.',
        variables: { 'ℏ': 'Reduziertes Plancksches Wirkungsquantum', '|ψ⟩': 'Zustandsvektor im Hilbertraum', 'Ĥ': 'Hamiltonoperator' },
        difficulty: 'expert',
      },
      {
        id: 'uncertainty-principle',
        name: 'Heisenberg-Unschärferelation',
        latex: '\\sigma_x \\sigma_p \\geq \\frac{\\hbar}{2}',
        alternativeForms: ['\\sigma_A \\sigma_B \\geq \\frac{1}{2} |\\langle [\\hat{A}, \\hat{B}] \\rangle|'],
        description: 'Fundamentale Grenze der gleichzeitigen Bestimmung komplementärer Observablen.',
        variables: { 'σ_x': 'Ortsunschärfe', 'σ_p': 'Impulsunschärfe' },
        difficulty: 'intermediate',
      },
      {
        id: 'density-matrix',
        name: 'Dichtematrix',
        latex: '\\rho = \\sum_i p_i |\\psi_i\\rangle\\langle\\psi_i|',
        description: 'Beschreibt gemischte Zustände. Von-Neumann-Entropie: S(ρ) = -Tr(ρ log ρ).',
        variables: { 'ρ': 'Dichteoperator', 'p_i': 'Klassische Wahrscheinlichkeit' },
        properties: ['Tr(ρ) = 1', 'ρ† = ρ', 'ρ ≥ 0'],
        difficulty: 'expert',
      },
      {
        id: 'bell-inequality',
        name: 'CHSH-Ungleichung (Bell)',
        latex: '|E(a,b) - E(a,b\') + E(a\',b) + E(a\',b\')| \\leq 2',
        description: 'Klassische Grenze für Korrelationen. Quantenmechanik erlaubt 2√2 (Tsirelson-Bound).',
        variables: { 'E(a,b)': 'Korrelationsfunktion für Messrichtungen a,b' },
        properties: ['Klassische Grenze: 2', 'Quantengrenze: 2√2 ≈ 2.828'],
        difficulty: 'expert',
      },
      {
        id: 'born-rule',
        name: 'Bornsche Regel',
        latex: 'P(a) = |\\langle a | \\psi \\rangle|^2',
        description: 'Verbindet den Zustandsvektor mit messbaren Wahrscheinlichkeiten.',
        variables: { 'P(a)': 'Messwahrscheinlichkeit', '⟨a|ψ⟩': 'Übergangs-Amplitude' },
        difficulty: 'intermediate',
      },
      {
        id: 'path-integral',
        name: 'Pfadintegral (Feynman)',
        latex: 'K(b,a) = \\int \\mathcal{D}[x(t)] \\, e^{\\frac{i}{\\hbar} S[x(t)]}',
        description: 'Summiert über alle möglichen Pfade zwischen Anfangs- und Endzustand.',
        variables: { 'K': 'Propagator', 'S': 'Wirkung (Action)', 'D[x]': 'Funktional-Integral' },
        origin: 'Richard Feynman, 1948',
        difficulty: 'expert',
      },
    ],
  },

  // ═══════════════════════════════════════════
  // 4. STRINGTHEORIE & QUANTENGRAVITATION
  // ═══════════════════════════════════════════
  {
    id: 'string-theory',
    name: 'Stringtheorie & Quantengravitation',
    icon: 'Orbit',
    color: '#10B981',
    description: 'Fundamentale Physik jenseits des Standardmodells.',
    formulas: [
      {
        id: 'nambu-goto',
        name: 'Nambu-Goto-Aktion',
        latex: 'S = -T \\int d\\tau d\\sigma \\sqrt{-\\det(\\gamma_{\\alpha\\beta})}',
        description: 'Geometrische Wirkung einer relativistischen Saite, proportional zur Weltfläche.',
        variables: { 'T': 'String-Spannung', 'γ_αβ': 'Induzierte Metrik' },
        difficulty: 'expert',
      },
      {
        id: 'polyakov-action',
        name: 'Polyakov-Aktion',
        latex: 'S_P = -\\frac{T}{2} \\int d^2\\sigma \\sqrt{-h} h^{\\alpha\\beta} \\partial_\\alpha X^\\mu \\partial_\\beta X_\\mu',
        description: 'Äquivalente Formulierung mit unabhängiger Weltflächenmetrik. Ermöglicht Quantisierung.',
        variables: { 'h_αβ': 'Hilfsmetrik', 'X^μ': 'Embedding-Funktion' },
        difficulty: 'expert',
      },
      {
        id: 'ads-cft',
        name: 'AdS/CFT-Korrespondenz',
        latex: 'Z_{\\text{AdS}}[\\phi_0] = \\langle \\exp\\left(\\int d^dx \\, \\phi_0 \\mathcal{O}\\right) \\rangle_{\\text{CFT}}',
        description: 'Holographische Dualität: Stringtheorie auf Anti-de Sitter ↔ konforme Feldtheorie am Rand.',
        variables: { 'Z': 'Zustandssumme', 'φ₀': 'Randbedingung', 'O': 'Konformer Operator' },
        origin: 'Maldacena, 1997',
        applications: ['Quark-Gluon-Plasma', 'ER=EPR', 'Kondensierte Materie'],
        difficulty: 'expert',
      },
      {
        id: 'virasoro',
        name: 'Virasoro-Algebra',
        latex: '[L_m, L_n] = (m-n)L_{m+n} + \\frac{c}{12}(m^3-m)\\delta_{m+n,0}',
        description: 'Zentral erweiterte Algebra der konformen Symmetrie. Kritische Dimension D=26 (bosonisch), D=10 (super).',
        variables: { 'L_m': 'Virasoro-Generatoren', 'c': 'Zentrale Ladung' },
        difficulty: 'expert',
      },
      {
        id: 'beta-function',
        name: 'Weyl-Anomalie / Beta-Funktion',
        latex: '\\beta^G_{\\mu\\nu} = R_{\\mu\\nu} + 2\\nabla_\\mu \\nabla_\\nu \\Phi - \\frac{1}{4}H_{\\mu\\lambda\\kappa}H_\\nu^{\\ \\lambda\\kappa} = 0',
        description: 'Konforme Invarianz-Bedingung → Bewegungsgleichungen für Hintergrundfelder.',
        variables: { 'R_μν': 'Ricci-Tensor', 'Φ': 'Dilaton', 'H': 'Kalb-Ramond-Feldstärke' },
        difficulty: 'expert',
      },
    ],
  },

  // ═══════════════════════════════════════════
  // 5. KOSMOLOGIE & ALLGEMEINE RELATIVITÄT
  // ═══════════════════════════════════════════
  {
    id: 'cosmology',
    name: 'Kosmologie & Allgemeine Relativität',
    icon: 'Globe',
    color: '#F59E0B',
    description: 'Die mathematische Struktur von Raumzeit und Universum.',
    formulas: [
      {
        id: 'einstein-field',
        name: 'Einstein-Feldgleichungen',
        latex: 'R_{\\mu\\nu} - \\frac{1}{2}Rg_{\\mu\\nu} + \\Lambda g_{\\mu\\nu} = \\frac{8\\pi G}{c^4} T_{\\mu\\nu}',
        description: 'Geometrie der Raumzeit ↔ Energie-Impuls-Verteilung.',
        variables: { 'R_μν': 'Ricci-Tensor', 'g_μν': 'Metrik', 'T_μν': 'Energie-Impuls-Tensor', 'Λ': 'Kosmologische Konstante' },
        origin: 'Albert Einstein, 1915',
        difficulty: 'expert',
      },
      {
        id: 'friedmann',
        name: 'Friedmann-Gleichungen',
        latex: 'H^2 = \\frac{8\\pi G}{3}\\rho - \\frac{k}{a^2} + \\frac{\\Lambda}{3}',
        description: 'Dynamik des Skalenfaktors a(t) in homogenen, isotropen Universen.',
        variables: { 'H': 'Hubble-Parameter (ȧ/a)', 'ρ': 'Energiedichte', 'k': 'Krümmung', 'a': 'Skalenfaktor' },
        properties: ['Ω_m + Ω_Λ + Ω_k = 1'],
        difficulty: 'advanced',
      },
      {
        id: 'hawking-temperature',
        name: 'Hawking-Temperatur',
        latex: 'T_H = \\frac{\\hbar c^3}{8\\pi G M k_B}',
        description: 'Thermodynamische Temperatur eines Schwarzen Lochs. Verbindet QM, Thermo und Gravitation.',
        variables: { 'T_H': 'Hawking-Temperatur', 'M': 'Masse', 'k_B': 'Boltzmann-Konstante' },
        applications: ['Schwarze-Loch-Thermodynamik', 'Information Paradox', 'Holographisches Prinzip'],
        difficulty: 'expert',
      },
      {
        id: 'geodesic',
        name: 'Geodätengleichung',
        latex: '\\frac{d^2 x^\\mu}{d\\tau^2} + \\Gamma^\\mu_{\\alpha\\beta} \\frac{dx^\\alpha}{d\\tau} \\frac{dx^\\beta}{d\\tau} = 0',
        description: 'Bewegungsgleichung in gekrümmter Raumzeit. Christoffel-Symbole = Gravitationskräfte.',
        variables: { 'Γ^μ_αβ': 'Christoffel-Symbole', 'τ': 'Eigenzeit' },
        difficulty: 'advanced',
      },
      {
        id: 'bekenstein-hawking',
        name: 'Bekenstein-Hawking-Entropie',
        latex: 'S_{BH} = \\frac{k_B c^3 A}{4 G \\hbar}',
        description: 'Entropie eines Schwarzen Lochs ist proportional zur Horizontfläche, nicht zum Volumen.',
        variables: { 'S_BH': 'Schwarze-Loch-Entropie', 'A': 'Horizontfläche' },
        origin: 'Bekenstein 1973, Hawking 1975',
        difficulty: 'expert',
      },
    ],
  },

  // ═══════════════════════════════════════════
  // 6. MODERNE KRYPTOGRAPHIE
  // ═══════════════════════════════════════════
  {
    id: 'cryptography',
    name: 'Moderne Kryptographie',
    icon: 'Lock',
    color: '#6366F1',
    description: 'Mathematische Grundlagen sicherer Kommunikation und digitaler Signaturen.',
    formulas: [
      {
        id: 'rsa',
        name: 'RSA-Verschlüsselung',
        latex: 'c = m^e \\mod n, \\quad m = c^d \\mod n',
        description: 'Asymmetrische Verschlüsselung basierend auf der Schwierigkeit der Primfaktorzerlegung.',
        variables: { 'n': 'Modul (n=pq)', 'e': 'Öffentlicher Exponent', 'd': 'Privater Exponent', 'm': 'Klartext', 'c': 'Chiffretext' },
        properties: ['ed ≡ 1 mod φ(n)', 'Sicherheit: |n| ≥ 2048 Bit'],
        difficulty: 'intermediate',
      },
      {
        id: 'ecdsa',
        name: 'ECDSA-Signatur',
        latex: 's = k^{-1}(z + r \\cdot d_A) \\pmod{n}',
        description: 'Elliptic Curve Digital Signature Algorithm — verwendet in Bitcoin.',
        variables: { 's': 'Signaturkomponente', 'k': 'Zufällige Nonce', 'z': 'Message-Hash', 'r': 'x-Koordinate von kG', 'd_A': 'Privater Schlüssel' },
        applications: ['Bitcoin', 'TLS/SSL', 'Digitale Zertifikate'],
        difficulty: 'advanced',
      },
      {
        id: 'ecdlp',
        name: 'Elliptic Curve Discrete Log Problem',
        latex: 'Q = k \\cdot G \\quad \\text{(finde k bei bekanntem Q, G)}',
        description: 'Die Sicherheitsgrundlage von ECC: Aus Q und G ist k nicht effizient berechenbar.',
        variables: { 'Q': 'Öffentlicher Punkt', 'G': 'Generatorpunkt', 'k': 'Privater Skalar' },
        properties: ['Beste klassische Attacke: O(√n) (Pollard ρ)', 'Quantenangriff: Shor O(log³ n)'],
        difficulty: 'advanced',
      },
      {
        id: 'diffie-hellman',
        name: 'Diffie-Hellman-Schlüsselaustausch',
        latex: 'K = g^{ab} \\mod p = (g^a)^b = (g^b)^a',
        description: 'Ermöglicht zwei Parteien, über einen unsicheren Kanal ein gemeinsames Geheimnis zu etablieren.',
        variables: { 'g': 'Generator', 'p': 'Primzahl', 'a,b': 'Private Exponenten', 'K': 'Gemeinsamer Schlüssel' },
        origin: 'Diffie & Hellman, 1976',
        difficulty: 'intermediate',
      },
      {
        id: 'aes-sbox',
        name: 'AES S-Box (Rijndael)',
        latex: 'S(x) = A \\cdot x^{-1}_{\\text{GF}(2^8)} \\oplus c',
        description: 'Nichtlineare Substitution im AES-Algorithmus über dem Galois-Feld GF(2⁸).',
        variables: { 'A': 'Affine Transformationsmatrix', 'x⁻¹': 'Multiplikatives Inverses in GF(2⁸)', 'c': 'Konstante' },
        difficulty: 'advanced',
      },
      {
        id: 'sha256-compression',
        name: 'SHA-256 Kompressionsfunktion',
        latex: 'H_i = \\Sigma_0(a) + \\text{Maj}(a,b,c) + \\Sigma_1(e) + \\text{Ch}(e,f,g) + K_t + W_t',
        description: 'Kern der SHA-256 Hash-Funktion: 64 Runden nichtlinearer Transformationen.',
        variables: { 'Σ₀,Σ₁': 'Rotations-Funktionen', 'Maj,Ch': 'Logische Funktionen', 'K_t': 'Rundenkonstante', 'W_t': 'Message Schedule' },
        applications: ['Bitcoin Mining', 'Digitale Signaturen', 'Integritätsprüfung'],
        difficulty: 'advanced',
      },
    ],
  },

  // ═══════════════════════════════════════════
  // 7. ANGRIFFSALGORITHMEN
  // ═══════════════════════════════════════════
  {
    id: 'attack-algorithms',
    name: 'Angriffsalgorithmen',
    icon: 'Swords',
    color: '#DC2626',
    description: 'Kryptanalytische Methoden und Quantenangriffe.',
    formulas: [
      {
        id: 'grover',
        name: 'Grovers Algorithmus',
        latex: 'O(\\sqrt{N}) \\text{ vs. } O(N) \\text{ klassisch}',
        description: 'Quadratische Beschleunigung für unstrukturierte Suche. Reduziert AES-256 auf 128-Bit-Sicherheit.',
        variables: { 'N': 'Suchraum-Größe' },
        origin: 'Lov Grover, 1996',
        difficulty: 'advanced',
      },
      {
        id: 'shor',
        name: 'Shors Algorithmus (Periodenfindiung)',
        latex: 'r : a^r \\equiv 1 \\pmod{N}, \\quad \\gcd(a^{r/2} \\pm 1, N)',
        description: 'Faktorisierung in Polynomialzeit → bricht RSA, DSA, ECDSA.',
        variables: { 'r': 'Periode', 'a': 'Zufällige Basis', 'N': 'Zu faktorisierende Zahl' },
        origin: 'Peter Shor, 1994',
        difficulty: 'expert',
      },
      {
        id: 'birthday-attack',
        name: 'Birthday-Attacke',
        latex: 'n \\approx 1.2\\sqrt{H} \\implies P(\\text{Kollision}) \\approx 50\\%',
        description: 'Probabilistischer Angriff auf Hash-Funktionen via Geburtstagsparadoxon.',
        variables: { 'n': 'Samples', 'H': 'Hash-Output-Raum' },
        difficulty: 'intermediate',
      },
      {
        id: 'differential-cryptanalysis',
        name: 'Differentielle Kryptanalyse',
        latex: '\\Pr[\\Delta Y = \\Delta Y^* | \\Delta X = \\Delta X^*] = p',
        description: 'Analysiert wie Input-Differenzen durch eine Chiffre propagieren.',
        variables: { 'ΔX*': 'Input-Differenz', 'ΔY*': 'Output-Differenz', 'p': 'Differentielle Wahrscheinlichkeit' },
        origin: 'Biham & Shamir, 1990',
        difficulty: 'expert',
      },
      {
        id: 'pollard-rho',
        name: 'Pollard-ρ-Methode',
        latex: 'O(\\sqrt{n}) \\text{ Gruppoperationen}',
        description: 'Beste generische Attacke auf ECDLP. Nutzt Zyklusdetektion in pseudo-zufälligen Walks.',
        variables: { 'n': 'Ordnung der Gruppe' },
        applications: ['ECDLP-Angriff', 'Bitcoin Puzzle Challenge'],
        difficulty: 'advanced',
      },
    ],
  },

  // ═══════════════════════════════════════════
  // 8. GITTER-KRYPTANALYSE (Post-Quantum)
  // ═══════════════════════════════════════════
  {
    id: 'lattice-cryptanalysis',
    name: 'Gitter-Kryptanalyse',
    icon: 'Grid3x3',
    color: '#14B8A6',
    description: 'Post-Quantum-Kryptographie basierend auf Gitter-Problemen.',
    formulas: [
      {
        id: 'lll-algorithm',
        name: 'LLL-Schranke',
        latex: '\\|b_1^*\\| \\leq 2^{(n-1)/4} (\\det L)^{1/n}',
        description: 'Obere Schranke des LLL-Algorithmus für den kürzesten reduzierten Vektor.',
        variables: { 'b₁*': 'Kürzester reduzierter Vektor', 'n': 'Gitterdimension', 'det L': 'Gitterdeterminante' },
        origin: 'Lenstra, Lenstra, Lovász, 1982',
        difficulty: 'expert',
      },
      {
        id: 'lwe',
        name: 'Learning With Errors (LWE)',
        latex: 'b = \\langle a, s \\rangle + e \\pmod{q}',
        description: 'Fundament vieler Post-Quantum-Krypto-Verfahren (CRYSTALS-Kyber, CRYSTALS-Dilithium).',
        variables: { 'a': 'Zufallsvektor', 's': 'Geheimvektor', 'e': 'Fehlerterm', 'q': 'Modulus' },
        applications: ['CRYSTALS-Kyber (NIST Standard)', 'Homomorphe Verschlüsselung'],
        difficulty: 'advanced',
      },
      {
        id: 'svp',
        name: 'Shortest Vector Problem',
        latex: '\\|v\\| \\leq \\gamma(n) \\cdot \\lambda_1(L)',
        description: 'NP-hart für exakte Lösung. Approximation ist die Basis der Gitter-Kryptographie.',
        variables: { 'v': 'Gefundener Vektor', 'γ(n)': 'Approximationsfaktor', 'λ₁(L)': 'Kürzester Vektor' },
        difficulty: 'expert',
      },
    ],
  },

  // ═══════════════════════════════════════════
  // 9. BITCOIN-SPEZIFISCH
  // ═══════════════════════════════════════════
  {
    id: 'bitcoin-specific',
    name: 'Bitcoin & Blockchain',
    icon: 'Bitcoin',
    color: '#F7931A',
    description: 'Mathematik hinter dem Bitcoin-Protokoll.',
    formulas: [
      {
        id: 'hashcash-pow',
        name: 'Hashcash Proof of Work',
        latex: '\\text{SHA256}(\\text{SHA256}(\\text{header})) < \\frac{2^{224}}{D}',
        description: 'Miners müssen einen Hash unter dem Difficulty-Target finden.',
        variables: { 'header': 'Block-Header (80 Bytes)', 'D': 'Difficulty-Parameter' },
        difficulty: 'intermediate',
      },
      {
        id: 'difficulty-adjustment',
        name: 'Difficulty-Anpassung',
        latex: 'D_{\\text{neu}} = D_{\\text{alt}} \\times \\frac{T_{\\text{ist}}}{T_{\\text{soll}}}',
        description: 'Retargets alle 2016 Blöcke für ~10 Minuten Blockzeit.',
        variables: { 'T_ist': 'Tatsächliche Zeit', 'T_soll': '2 Wochen' },
        difficulty: 'beginner',
      },
      {
        id: 'secp256k1',
        name: 'secp256k1 Kurvengleichung',
        latex: 'y^2 = x^3 + 7 \\pmod{p}',
        description: 'Die von Bitcoin verwendete elliptische Kurve. p = 2²⁵⁶ − 2³² − 977.',
        variables: { 'p': 'Primzahl des Feldes', 'G': 'Generatorpunkt', 'n': 'Ordnung (≈ 2²⁵⁶)' },
        properties: ['Kofaktor h = 1', 'Koblitz-Kurve (a=0, b=7)', 'Nicht vom NIST standardisiert'],
        difficulty: 'advanced',
      },
      {
        id: 'merkle-root',
        name: 'Merkle-Wurzel',
        latex: 'M_{\\text{root}} = H(H(H(tx_1, tx_2), H(tx_3, tx_4)), \\ldots)',
        description: 'Kryptographische Zusammenfassung aller Transaktionen in einem Block.',
        variables: { 'H': 'Double-SHA256', 'tx_i': 'Transaktions-Hashes' },
        difficulty: 'intermediate',
      },
    ],
  },

  // ═══════════════════════════════════════════
  // 10. KOMPLEXITÄTSTHEORIE
  // ═══════════════════════════════════════════
  {
    id: 'complexity',
    name: 'Komplexitätstheorie',
    icon: 'Layers',
    color: '#A855F7',
    description: 'Klassifikation von Berechnungsproblemen nach Ressourcenbedarf.',
    formulas: [
      {
        id: 'p-vs-np',
        name: 'P vs NP',
        latex: '\\text{P} \\subseteq \\text{NP}, \\quad \\text{P} \\stackrel{?}{=} \\text{NP}',
        description: 'Das wichtigste offene Problem der theoretischen Informatik. Millennium-Problem ($1M).',
        variables: { 'P': 'Polynomial lösbar', 'NP': 'Polynomial verifizierbar' },
        difficulty: 'advanced',
      },
      {
        id: 'bqp',
        name: 'BQP (Quantum Polynomial)',
        latex: '\\text{BPP} \\subseteq \\text{BQP} \\subseteq \\text{PSPACE}',
        description: 'Problemklasse für Quantencomputer. Enthält Faktorisierung und diskrete Logarithmen.',
        variables: { 'BPP': 'Klassisches Analogon', 'BQP': 'Quantum-Klasse', 'PSPACE': 'Polynomial Space' },
        difficulty: 'expert',
      },
      {
        id: 'cook-levin',
        name: 'Cook-Levin-Theorem',
        latex: '\\text{SAT} \\in \\text{NP-complete} \\implies \\forall L \\in \\text{NP}, L \\leq_p \\text{SAT}',
        description: 'SAT ist NP-vollständig: Jedes NP-Problem kann polynomial auf SAT reduziert werden.',
        variables: { 'SAT': 'Boolesche Erfüllbarkeit', '≤_p': 'Polynomiale Reduktion' },
        origin: 'Cook 1971, Levin 1973',
        difficulty: 'advanced',
      },
    ],
  },

  // ═══════════════════════════════════════════
  // 11. ENTROPIE-KOLLAPS-VEKTOREN
  // ═══════════════════════════════════════════
  {
    id: 'entropy-collapse',
    name: 'Entropie-Kollaps',
    icon: 'Zap',
    color: '#EAB308',
    description: 'Analyse von Entropie-Degradation in kryptographischen Systemen.',
    formulas: [
      {
        id: 'entropy-rate-decay',
        name: 'Entropie-Zerfallsrate',
        latex: 'H_n = H_0 \\cdot e^{-\\lambda t} + H_{\\text{floor}}',
        description: 'Modelliert Entropie-Degradation in schlecht geseedeten PRNGs.',
        variables: { 'H₀': 'Initiale Entropie', 'λ': 'Zerfallsrate', 'H_floor': 'Minimale Entropie' },
        difficulty: 'advanced',
      },
      {
        id: 'leftover-hash',
        name: 'Leftover-Hash-Lemma',
        latex: '\\text{SD}(h(X), U_m) \\leq \\frac{1}{2} \\sqrt{2^{m - H_{\\infty}(X)}}',
        description: 'Universelle Hash-Funktion auf High-Entropy-Quelle → near-uniform Output.',
        variables: { 'SD': 'Statistische Distanz', 'h': 'Universelle Hash-Funktion', 'm': 'Output-Länge' },
        difficulty: 'expert',
      },
      {
        id: 'reny-entropy',
        name: 'Rényi-Entropie',
        latex: 'H_\\alpha(X) = \\frac{1}{1-\\alpha} \\log_2 \\sum_i p_i^\\alpha',
        description: 'Verallgemeinerte Entropie-Familie. α=1: Shannon, α→∞: Min-Entropie, α=2: Kollisions-Entropie.',
        variables: { 'α': 'Ordnung (α ≥ 0, α ≠ 1)', 'p_i': 'Wahrscheinlichkeiten' },
        difficulty: 'advanced',
      },
    ],
  },

  // ═══════════════════════════════════════════
  // 12. OMNIGENESE
  // ═══════════════════════════════════════════
  {
    id: 'omnigenesis',
    name: 'Omnigenese',
    icon: 'Dna',
    color: '#EC4899',
    description: 'Genetische Vererbung komplexer Merkmale — das omnigene Modell.',
    formulas: [
      {
        id: 'omnigenic-liability',
        name: 'Omnigenes Haftungsmodell',
        latex: 'y = \\sum_{i \\in \\text{core}} \\beta_i g_i + \\sum_{j \\in \\text{periph}} \\beta_j g_j + \\epsilon',
        description: 'Alle Gene in krankheitsrelevanten Zellen tragen zur Heritabilität bei.',
        variables: { 'y': 'Phänotypische Haftung', 'β_i': 'Kern-Gen-Effekt', 'ε': 'Umweltrauschen' },
        origin: 'Boyle, Li & Pritchard, 2017',
        difficulty: 'advanced',
      },
      {
        id: 'heritability',
        name: 'Heritabilitäts-Partition',
        latex: 'h^2 = \\frac{\\sigma^2_G}{\\sigma^2_P} = \\frac{\\sigma^2_{\\text{core}} + \\sigma^2_{\\text{periph}}}{\\sigma^2_G + \\sigma^2_E}',
        description: 'Zerlegung der Gesamtheritabilität in Kern- und periphere Komponenten.',
        variables: { 'h²': 'Heritabilität', 'σ²_G': 'Genetische Varianz', 'σ²_P': 'Phänotypische Varianz' },
        difficulty: 'intermediate',
      },
    ],
  },

  // ═══════════════════════════════════════════
  // 13. ZAHLENTHEORIE
  // ═══════════════════════════════════════════
  {
    id: 'number-theory',
    name: 'Zahlentheorie',
    icon: 'Hash',
    color: '#0EA5E9',
    description: 'Fundamente der Zahlentheorie — die Königin der Mathematik.',
    formulas: [
      {
        id: 'euler-totient',
        name: 'Euler-Totientenfunktion',
        latex: '\\phi(n) = n \\prod_{p|n} \\left(1 - \\frac{1}{p}\\right)',
        description: 'Zählt die zu n teilerfremden Zahlen ≤ n. Fundamental für RSA.',
        variables: { 'φ(n)': 'Anzahl teilerfremder Zahlen', 'p': 'Primfaktoren von n' },
        properties: ['φ(pq) = (p-1)(q-1) für Primzahlen p,q', 'Multiplikativ: φ(mn) = φ(m)φ(n) wenn gcd=1'],
        difficulty: 'intermediate',
      },
      {
        id: 'fermat-little',
        name: 'Kleiner Satz von Fermat',
        latex: 'a^{p-1} \\equiv 1 \\pmod{p} \\quad (\\gcd(a,p)=1)',
        description: 'Basis für Primzahltests (Miller-Rabin) und RSA.',
        variables: { 'a': 'Basis', 'p': 'Primzahl' },
        difficulty: 'intermediate',
      },
      {
        id: 'prime-counting',
        name: 'Primzahlsatz',
        latex: '\\pi(x) \\sim \\frac{x}{\\ln x}',
        description: 'Asymptotische Verteilung der Primzahlen. Verfeinert: π(x) ≈ Li(x).',
        variables: { 'π(x)': 'Anzahl Primzahlen ≤ x', 'Li(x)': 'Logarithmisches Integral' },
        origin: 'Hadamard & de la Vallée-Poussin, 1896',
        difficulty: 'advanced',
      },
      {
        id: 'riemann-hypothesis',
        name: 'Riemannsche Vermutung',
        latex: '\\zeta(s) = \\sum_{n=1}^\\infty n^{-s} = 0 \\implies \\text{Re}(s) = \\frac{1}{2}',
        description: 'Alle nichttrivialen Nullstellen der Zeta-Funktion liegen auf Re(s) = 1/2. Unbewiesen!',
        variables: { 'ζ(s)': 'Riemann-Zeta-Funktion', 's': 'Komplexe Variable' },
        properties: ['Millennium-Problem ($1M)', 'Unbewiesen seit 1859'],
        origin: 'Bernhard Riemann, 1859',
        difficulty: 'expert',
      },
      {
        id: 'quadratic-reciprocity',
        name: 'Quadratisches Reziprozitätsgesetz',
        latex: '\\left(\\frac{p}{q}\\right)\\left(\\frac{q}{p}\\right) = (-1)^{\\frac{p-1}{2}\\frac{q-1}{2}}',
        description: 'Verbindet quadratische Reste modulo zweier Primzahlen. Gauß\' „Goldenes Theorem".',
        variables: { '(p/q)': 'Legendre-Symbol' },
        origin: 'Carl Friedrich Gauß, 1801',
        difficulty: 'advanced',
      },
    ],
  },

  // ═══════════════════════════════════════════
  // 14. TOPOLOGIE & DIFFERENTIALGEOMETRIE
  // ═══════════════════════════════════════════
  {
    id: 'topology',
    name: 'Topologie & Differentialgeometrie',
    icon: 'Torus',
    color: '#F472B6',
    description: 'Geometrische Strukturen, die unter stetigen Deformationen invariant sind.',
    formulas: [
      {
        id: 'gauss-bonnet',
        name: 'Gauß-Bonnet-Theorem',
        latex: '\\int_M K \\, dA = 2\\pi \\chi(M)',
        description: 'Verbindet lokale Krümmung K mit globaler Topologie χ (Euler-Charakteristik).',
        variables: { 'K': 'Gauß-Krümmung', 'χ(M)': 'Euler-Charakteristik', 'dA': 'Flächenelement' },
        properties: ['χ(Sphäre) = 2', 'χ(Torus) = 0'],
        difficulty: 'expert',
      },
      {
        id: 'euler-characteristic',
        name: 'Euler-Charakteristik',
        latex: '\\chi = V - E + F',
        description: 'Topologische Invariante für Polyeder. V = Ecken, E = Kanten, F = Flächen.',
        variables: { 'V': 'Vertices', 'E': 'Edges', 'F': 'Faces' },
        origin: 'Leonhard Euler, 1758',
        difficulty: 'beginner',
      },
      {
        id: 'stokes-theorem',
        name: 'Satz von Stokes (verallgemeinert)',
        latex: '\\int_M d\\omega = \\oint_{\\partial M} \\omega',
        description: 'Vereinheitlicht Gauß, Green, Stokes, Divergenz in einer Gleichung.',
        variables: { 'ω': 'Differentialform', 'M': 'Mannigfaltigkeit', '∂M': 'Rand' },
        difficulty: 'advanced',
      },
      {
        id: 'chern-class',
        name: 'Chern-Klassen',
        latex: 'c_1(L) = \\frac{i}{2\\pi} F \\in H^2(M, \\mathbb{Z})',
        description: 'Topologische Invarianten von Vektorbündeln. Fundamental für Stringtheorie und Yang-Mills.',
        variables: { 'c₁': 'Erste Chern-Klasse', 'F': 'Krümmungsform', 'L': 'Linienbündel' },
        difficulty: 'expert',
      },
    ],
  },

  // ═══════════════════════════════════════════
  // 15. STATISTISCHE MECHANIK & THERMODYNAMIK
  // ═══════════════════════════════════════════
  {
    id: 'stat-mech',
    name: 'Statistische Mechanik',
    icon: 'Thermometer',
    color: '#F97316',
    description: 'Brücke zwischen mikroskopischer Physik und makroskopischer Thermodynamik.',
    formulas: [
      {
        id: 'boltzmann-entropy',
        name: 'Boltzmann-Entropie',
        latex: 'S = k_B \\ln \\Omega',
        description: 'Verbindet makroskopische Entropie mit der Anzahl der Mikrozustände. Auf Boltzmanns Grabstein.',
        variables: { 'S': 'Entropie', 'k_B': 'Boltzmann-Konstante', 'Ω': 'Anzahl Mikrozustände' },
        origin: 'Ludwig Boltzmann, 1877',
        difficulty: 'intermediate',
      },
      {
        id: 'partition-function',
        name: 'Zustandssumme',
        latex: 'Z = \\sum_i e^{-\\beta E_i}, \\quad \\beta = \\frac{1}{k_B T}',
        description: 'Erzeugende Funktion der Thermodynamik. Alle Gleichgewichtseigenschaften ableitbar.',
        variables: { 'Z': 'Zustandssumme', 'β': 'Inverse Temperatur', 'E_i': 'Energieniveau' },
        properties: ['F = -k_BT ln Z (Freie Energie)', '⟨E⟩ = -∂ln Z/∂β'],
        difficulty: 'advanced',
      },
      {
        id: 'landauer',
        name: 'Landauer-Prinzip',
        latex: 'Q \\geq k_B T \\ln 2',
        description: 'Minimale Energie zum Löschen eines Bits. Verbindet Information mit Thermodynamik.',
        variables: { 'Q': 'Dissipierte Wärme', 'T': 'Temperatur', 'k_B': 'Boltzmann-Konstante' },
        origin: 'Rolf Landauer, 1961',
        applications: ['Reversible Computing', 'Maxwell-Dämon', 'Quanteninformation'],
        difficulty: 'advanced',
      },
      {
        id: 'ising-model',
        name: 'Ising-Modell',
        latex: 'H = -J \\sum_{\\langle i,j \\rangle} s_i s_j - h \\sum_i s_i',
        description: 'Grundmodell des Magnetismus und der Phasenübergänge. Exakt lösbar in 2D (Onsager 1944).',
        variables: { 'J': 'Kopplungsstärke', 's_i': 'Spin (±1)', 'h': 'Externes Feld' },
        difficulty: 'intermediate',
      },
    ],
  },
];

export function searchFormulas(query: string): { category: FormulaCategory; formula: Formula }[] {
  const q = query.toLowerCase();
  const results: { category: FormulaCategory; formula: Formula }[] = [];
  for (const cat of NEXUS_CATEGORIES) {
    for (const f of cat.formulas) {
      if (
        f.name.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.id.includes(q) ||
        Object.keys(f.variables).some(k => k.toLowerCase().includes(q)) ||
        Object.values(f.variables).some(v => v.toLowerCase().includes(q)) ||
        (f.applications && f.applications.some(a => a.toLowerCase().includes(q)))
      ) {
        results.push({ category: cat, formula: f });
      }
    }
  }
  return results;
}

export function getTotalFormulaCount(): number {
  return NEXUS_CATEGORIES.reduce((sum, cat) => sum + cat.formulas.length, 0);
}
