import { AlertTriangle, Shield, Scale } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function LegalDisclaimer() {
  return (
    <Alert className="border-crypto-orange/50 bg-crypto-orange/10 mb-8">
      <AlertTriangle className="h-5 w-5 text-crypto-orange" />
      <AlertTitle className="text-crypto-orange font-display flex items-center gap-2">
        <Scale className="h-4 w-4" />
        RECHTLICHER HINWEIS / LEGAL DISCLAIMER
      </AlertTitle>
      <AlertDescription className="text-muted-foreground space-y-2 mt-2">
        <p className="flex items-start gap-2">
          <Shield className="h-4 w-4 mt-0.5 text-crypto-gold shrink-0" />
          <span>
            <strong className="text-foreground">Eigenverantwortung:</strong> Dieses Tool dient ausschließlich 
            <strong className="text-crypto-green"> wissenschaftlichen und bildungstechnischen Zwecken</strong>. 
            Jeder Nutzer ist für die Verwendung dieser Software <strong className="text-crypto-gold">selbst verantwortlich</strong>.
          </span>
        </p>
        <p className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 text-crypto-red shrink-0" />
          <span>
            <strong className="text-crypto-red">WARNUNG:</strong> Die unbefugte Verwendung von Private Keys, 
            die Ihnen nicht gehören, sowie der Diebstahl von Kryptowährungen ist eine 
            <strong className="text-crypto-red"> Straftat</strong> und führt zu 
            <strong className="text-crypto-red"> strafrechtlichen Konsequenzen</strong> 
            (§§ 202a, 263a, 303a StGB - Computerbetrug, Datenveränderung, Ausspähen von Daten).
          </span>
        </p>
        <p className="text-xs text-muted-foreground/70 mt-3 border-t border-border/30 pt-2">
          Mit der Nutzung dieser Tools bestätigen Sie, dass Sie diese ausschließlich für legale Zwecke 
          wie Forschung, Bildung, Wiederherstellung eigener Wallets oder autorisierte Sicherheitstests verwenden.
        </p>
      </AlertDescription>
    </Alert>
  );
}
