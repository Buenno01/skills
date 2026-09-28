import * as React from "react";
import { Loader2, Minus, Plus, Trash2, Check, ShoppingBasket, Settings2 } from "lucide-react";
import { cn, fmt } from "@/lib/utils";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Badge } from "@/ui/badge";
import { Switch } from "@/ui/switch";
import { Checkbox } from "@/ui/checkbox";
import { Separator } from "@/ui/separator";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/ui/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/ui/popover";
import { Callout } from "@/blocks";
import { app, initialCart, fees, deliveryWindows, paymentMethods, copy, type Product } from "./data";

/* ---------- Flow model ---------- */
type Screen = "cart" | "delivery" | "payment" | "done";
type Status = "idle" | "loading" | "error";
type Frame = "mobile" | "desktop";
const ORDER: Screen[] = ["cart", "delivery", "payment", "done"];

const money = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

/* ---------- Frame: mobile (390px, bordered) vs desktop (max 960px) ---------- */
function Frame({ kind, children }: { kind: Frame; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/40 p-6 flex justify-center items-start">
      <div className={cn(
        "bg-background w-full",
        kind === "mobile" ? "max-w-[390px] min-h-[780px] rounded-[28px] border-4 border-border shadow-sm overflow-hidden" : "max-w-[960px] rounded-lg border shadow-sm"
      )}>
        {children}
      </div>
    </div>
  );
}

/* ---------- Stepper ---------- */
function Stepper({ current }: { current: Screen }) {
  const idx = ORDER.indexOf(current);
  return (
    <ol className="flex items-center gap-2 text-xs">
      {app.steps.map((label, i) => (
        <li key={label} className="flex items-center gap-2">
          <span className={cn("size-5 rounded-full grid place-items-center border text-[11px] font-medium", i < idx && "bg-primary text-primary-foreground border-primary", i === idx && "border-primary", i > idx && "text-muted-foreground")}>
            {i < idx ? <Check className="size-3" /> : i + 1}
          </span>
          {i === idx && <span className="font-medium">{label}</span>}
          {i < app.steps.length - 1 && <span className="w-4 h-px bg-border" />}
        </li>
      ))}
    </ol>
  );
}

/* ---------- Order summary (shared) ---------- */
function Summary({ cart, coupon }: { cart: Product[]; coupon: boolean }) {
  const subtotal = cart.reduce((s, p) => s + p.price * p.qty, 0);
  const discount = coupon ? subtotal * 0.1 : 0;
  const delivery = subtotal - discount >= fees.freeAbove ? 0 : fees.delivery;
  const total = subtotal - discount + delivery;
  return (
    <dl className="text-sm space-y-1.5 tabular-nums">
      <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{money(subtotal)}</dd></div>
      {coupon && <div className="flex justify-between"><dt className="text-muted-foreground">Cupom {copy.validCoupon}</dt><dd className="text-success">-{money(discount)}</dd></div>}
      <div className="flex justify-between"><dt className="text-muted-foreground">Entrega</dt><dd>{delivery === 0 ? "Grátis" : money(delivery)}</dd></div>
      <Separator className="my-2" />
      <div className="flex justify-between font-semibold text-base"><dt>Total</dt><dd>{money(total)}</dd></div>
    </dl>
  );
}

/* ---------- Screen 1: cart (default, hover, empty, dialog) ---------- */
function CartScreen({ cart, setCart, coupon, setCoupon, onNext }: { cart: Product[]; setCart: (c: Product[]) => void; coupon: boolean; setCoupon: (v: boolean) => void; onNext: () => void }) {
  const [removing, setRemoving] = React.useState<Product | null>(null);
  const [code, setCode] = React.useState("");
  const [codeError, setCodeError] = React.useState(false);
  const change = (id: string, d: number) => setCart(cart.map(p => p.id === id ? { ...p, qty: Math.max(1, p.qty + d) } : p));
  const applyCoupon = () => { const ok = code.trim().toUpperCase() === copy.validCoupon; setCoupon(ok); setCodeError(!ok); };

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-16 px-6 gap-3">
        <ShoppingBasket className="size-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">{copy.emptyCart.title}</h2>
        <p className="text-sm text-muted-foreground max-w-[28ch]">{copy.emptyCart.body}</p>
        <Button className="mt-2 h-11" onClick={() => setCart(initialCart)}>{copy.emptyCart.action}</Button>
      </div>
    );
  }
  return (
    <>
      <ul className="divide-y">
        {cart.map(p => (
          <li key={p.id} className="py-3 -mx-2 px-2 rounded-md hover:bg-muted/60 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.detail}</p>
              </div>
              <span className="text-sm font-medium tabular-nums whitespace-nowrap">{money(p.price * p.qty)}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center border rounded-md">
                <Button variant="ghost" size="icon" className="size-11" aria-label="Diminuir" onClick={() => change(p.id, -1)}><Minus /></Button>
                <span className="w-6 text-center text-sm tabular-nums">{p.qty}</span>
                <Button variant="ghost" size="icon" className="size-11" aria-label="Aumentar" onClick={() => change(p.id, 1)}><Plus /></Button>
              </div>
              <Button variant="ghost" size="sm" className="h-11 text-muted-foreground" onClick={() => setRemoving(p)}><Trash2 /> Remover</Button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 space-y-1.5">
        <Label htmlFor="coupon">Cupom</Label>
        <div className="flex gap-2">
          <Input id="coupon" className="h-11" placeholder="Ex.: FEIRA10" value={code} onChange={e => { setCode(e.target.value); setCodeError(false); }} aria-invalid={codeError} />
          <Button variant="outline" className="h-11" onClick={applyCoupon}>Aplicar</Button>
        </div>
        {codeError ? <p className="text-xs text-destructive">Cupom inválido ou expirado.</p> : coupon ? <p className="text-xs text-success">Cupom aplicado.</p> : <p className="text-xs text-muted-foreground">{copy.couponHint}</p>}
      </div>
      <Separator className="my-4" />
      <Summary cart={cart} coupon={coupon} />
      <Button className="w-full h-11 mt-4" onClick={onNext}>Continuar para entrega</Button>

      <Dialog open={removing !== null} onOpenChange={o => !o && setRemoving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover item?</DialogTitle>
            <DialogDescription>{removing?.name} sai do carrinho. Você pode adicionar de novo pela lista de produtos.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" className="h-11">Manter</Button></DialogClose>
            <Button variant="destructive" className="h-11" onClick={() => { setCart(cart.filter(p => p.id !== removing?.id)); setRemoving(null); }}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ---------- Screen 2: delivery form (Input, Select, Switch, Checkbox, inline errors) ---------- */
type Address = { cep: string; street: string; window: string; concierge: boolean; save: boolean };
function DeliveryScreen({ address, setAddress, onBack, onNext }: { address: Address; setAddress: (a: Address) => void; onBack: () => void; onNext: () => void }) {
  const [touched, setTouched] = React.useState(false);
  const cepOk = address.cep.replace(/\D/g, "").length === 8;
  const streetOk = address.street.trim().length > 3;
  const submit = () => { setTouched(true); if (cepOk && streetOk) onNext(); };
  const set = <K extends keyof Address>(k: K, v: Address[K]) => setAddress({ ...address, [k]: v });
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="cep">CEP</Label>
        <Input id="cep" className="h-11" inputMode="numeric" placeholder="00000-000" value={address.cep} onChange={e => set("cep", e.target.value)} aria-invalid={touched && !cepOk} />
        {touched && !cepOk && <p className="text-xs text-destructive">{copy.cepError}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="street">Rua e número</Label>
        <Input id="street" className="h-11" placeholder="Rua das Palmeiras, 120" value={address.street} onChange={e => set("street", e.target.value)} aria-invalid={touched && !streetOk} />
        {touched && !streetOk && <p className="text-xs text-destructive">{copy.streetError}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Janela de entrega</Label>
        <Select value={address.window} onValueChange={v => set("window", v)}>
          <SelectTrigger className="w-full h-11"><SelectValue placeholder="Escolha um horário" /></SelectTrigger>
          <SelectContent>{deliveryWindows.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between min-h-11">
        <Label htmlFor="concierge" className="font-normal">Pode deixar na portaria</Label>
        <Switch id="concierge" checked={address.concierge} onCheckedChange={v => set("concierge", v)} />
      </div>
      <div className="flex items-center gap-3 min-h-11">
        <Checkbox id="save" checked={address.save} onCheckedChange={v => set("save", v === true)} />
        <Label htmlFor="save" className="font-normal">Salvar endereço para a próxima compra</Label>
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="h-11 flex-1" onClick={onBack}>Voltar</Button>
        <Button className="h-11 flex-1" onClick={submit}>Ir para pagamento</Button>
      </div>
    </div>
  );
}

/* ---------- Screen 3: payment (loading, error) ---------- */
function PaymentScreen({ cart, coupon, method, setMethod, status, onPay, onBack }: { cart: Product[]; coupon: boolean; method: string; setMethod: (m: string) => void; status: Status; onPay: () => void; onBack: () => void }) {
  return (
    <div className="space-y-4">
      {status === "error" && <Callout kind="danger" title={copy.declined.title}>{copy.declined.body}</Callout>}
      <div className="space-y-2">
        {paymentMethods.map(m => (
          <button key={m.value} type="button" onClick={() => setMethod(m.value)} aria-pressed={method === m.value}
            className={cn("w-full min-h-11 flex items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors hover:bg-muted/60 cursor-pointer", method === m.value && "border-primary ring-1 ring-primary")}>
            <span className={cn("size-4 rounded-full border grid place-items-center", method === m.value && "border-primary")}>{method === m.value && <span className="size-2 rounded-full bg-primary" />}</span>
            <span className="flex-1"><span className="block text-sm font-medium">{m.label}</span><span className="block text-xs text-muted-foreground">{m.hint}</span></span>
          </button>
        ))}
      </div>
      {method === "card" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5"><Label htmlFor="cardno">Número do cartão</Label><Input id="cardno" className="h-11" inputMode="numeric" placeholder="0000 0000 0000 0000" /></div>
          <div className="space-y-1.5"><Label htmlFor="exp">Validade</Label><Input id="exp" className="h-11" placeholder="MM/AA" /></div>
          <div className="space-y-1.5"><Label htmlFor="cvv">CVV</Label><Input id="cvv" className="h-11" inputMode="numeric" placeholder="123" /></div>
        </div>
      )}
      <Separator />
      <Summary cart={cart} coupon={coupon} />
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="h-11 flex-1" onClick={onBack} disabled={status === "loading"}>Voltar</Button>
        <Button className="h-11 flex-1" onClick={onPay} disabled={status === "loading"}>
          {status === "loading" ? <><Loader2 className="animate-spin" /> Processando</> : "Pagar"}
        </Button>
      </div>
    </div>
  );
}

/* ---------- Screen 4: success ---------- */
function DoneScreen({ cart, coupon, address, onRestart }: { cart: Product[]; coupon: boolean; address: Address; onRestart: () => void }) {
  const win = deliveryWindows.find(w => w.value === address.window)?.label ?? "a combinar";
  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center text-center gap-2 pt-4">
        <span className="size-12 rounded-full bg-success/15 text-success grid place-items-center"><Check className="size-6" /></span>
        <h2 className="text-lg font-semibold">{copy.success.title}</h2>
        <p className="text-sm text-muted-foreground max-w-[32ch]">{copy.success.body}</p>
        <Badge variant="outline" className="mt-1 font-mono">Pedido 48213</Badge>
      </div>
      <div className="rounded-md border p-3 text-sm space-y-1">
        <p><span className="text-muted-foreground">Entrega:</span> {address.street || "Endereço salvo"}</p>
        <p><span className="text-muted-foreground">Janela:</span> {win}</p>
        <p><span className="text-muted-foreground">Itens:</span> {fmt.int(cart.reduce((s, p) => s + p.qty, 0))}</p>
      </div>
      <Summary cart={cart} coupon={coupon} />
      <Button variant="outline" className="w-full h-11" onClick={onRestart}>Fazer outro pedido</Button>
    </div>
  );
}

/* ---------- Prototype controls: hidden from print, floats over the composition ---------- */
function ScreenPicker({ screen, setScreen, frame, setFrame, onEmpty, onError }: { screen: Screen; setScreen: (s: Screen) => void; frame: Frame; setFrame: (f: Frame) => void; onEmpty: () => void; onError: () => void }) {
  return (
    <div className="no-print fixed bottom-4 right-4 z-50">
      <Popover>
        <PopoverTrigger asChild><Button variant="outline" size="sm" className="shadow-md bg-background"><Settings2 /> Protótipo</Button></PopoverTrigger>
        <PopoverContent align="end" className="w-72 space-y-3">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Tela</p>
            <div className="grid grid-cols-2 gap-1.5">
              {ORDER.map((s, i) => <Button key={s} size="sm" variant={s === screen ? "default" : "outline"} className="justify-start" onClick={() => setScreen(s)}>{i + 1}. {app.steps[i]}</Button>)}
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Estados</p>
            <div className="grid gap-1.5">
              <Button size="sm" variant="outline" className="justify-start" onClick={onEmpty}>Carrinho vazio</Button>
              <Button size="sm" variant="outline" className="justify-start" onClick={onError}>Pagamento negado</Button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="frame" className="text-xs font-medium text-muted-foreground">Frame desktop</Label>
            <Switch id="frame" checked={frame === "desktop"} onCheckedChange={v => setFrame(v ? "desktop" : "mobile")} />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/* ---------- App: state machine + screen switcher ---------- */
export default function App() {
  const initial = (typeof location !== "undefined" && (location.hash.replace("#", "") as Screen)) || "cart";
  const [screen, setScreen] = React.useState<Screen>(ORDER.includes(initial) ? initial : "cart");
  const [status, setStatus] = React.useState<Status>("idle");
  const [frame, setFrame] = React.useState<Frame>("mobile");
  const [cart, setCart] = React.useState<Product[]>(initialCart);
  const [coupon, setCoupon] = React.useState(false);
  const [address, setAddress] = React.useState<Address>({ cep: "", street: "", window: "", concierge: false, save: true });
  const [method, setMethod] = React.useState<string>("pix");

  const go = (s: Screen) => { setStatus("idle"); setScreen(s); };
  const pay = () => { setStatus("loading"); setTimeout(() => { if (method === "card") setStatus("error"); else { setStatus("idle"); setScreen("done"); } }, 900); };
  const restart = () => { setCart(initialCart); setCoupon(false); setMethod("pix"); go("cart"); };

  const body = (
    <>
      {screen === "cart" && <CartScreen cart={cart} setCart={setCart} coupon={coupon} setCoupon={setCoupon} onNext={() => go("delivery")} />}
      {screen === "delivery" && <DeliveryScreen address={address} setAddress={setAddress} onBack={() => go("cart")} onNext={() => go("payment")} />}
      {screen === "payment" && <PaymentScreen cart={cart} coupon={coupon} method={method} setMethod={setMethod} status={status} onPay={pay} onBack={() => go("delivery")} />}
      {screen === "done" && <DoneScreen cart={cart} coupon={coupon} address={address} onRestart={restart} />}
    </>
  );

  return (
    <Frame kind={frame}>
      <header className="px-5 pt-5 pb-3 border-b">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold">{app.name}</span>
          <span className="text-xs text-muted-foreground">{app.flowTitle}</span>
        </div>
        <Stepper current={screen} />
      </header>
      {frame === "desktop" && screen !== "done" ? (
        <div className="grid grid-cols-[1fr_320px] gap-8 p-6">
          <section>{body}</section>
          <aside className="border-l pl-8 self-start"><p className="text-sm font-medium mb-3">Resumo</p><Summary cart={cart} coupon={coupon} /></aside>
        </div>
      ) : (
        <section className="p-5">{body}</section>
      )}
      <ScreenPicker screen={screen} setScreen={go} frame={frame} setFrame={setFrame}
        onEmpty={() => { setCart([]); go("cart"); }}
        onError={() => { setMethod("card"); setScreen("payment"); setStatus("error"); }} />
    </Frame>
  );
}
