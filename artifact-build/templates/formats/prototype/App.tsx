import * as React from "react";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/ui/card";
import { Badge } from "@/ui/badge";
import { proto } from "./data";

type Step = "form" | "loading" | "done" | "error";

export default function App() {
  const [step, setStep] = React.useState<Step>("form");
  const [value, setValue] = React.useState("");
  const submit = () => { setStep("loading"); setTimeout(() => setStep(value.trim() ? "done" : "error"), 700); };
  return (
    <div className="min-h-screen bg-muted/40 grid place-items-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between"><CardTitle>{proto.title}</CardTitle><Badge variant="secondary">Protótipo</Badge></div>
          <CardDescription>{proto.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "form" && <div className="space-y-2"><Label htmlFor="f">{proto.fieldLabel}</Label><Input id="f" value={value} onChange={e => setValue(e.target.value)} placeholder={proto.placeholder} /></div>}
          {step === "loading" && <p className="text-sm text-muted-foreground">Processando...</p>}
          {step === "done" && <p className="text-sm">Pronto. {proto.successText}</p>}
          {step === "error" && <p className="text-sm text-destructive">{proto.errorText}</p>}
        </CardContent>
        <CardFooter className="justify-end gap-2">
          {step !== "form" && <Button variant="ghost" onClick={() => setStep("form")}>Voltar</Button>}
          {step === "form" && <Button onClick={submit}>Continuar</Button>}
        </CardFooter>
      </Card>
    </div>
  );
}
