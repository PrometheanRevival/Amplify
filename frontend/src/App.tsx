import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { arcTestnet } from "./wagmi";
import { shortAddr, formatDistanceToNow } from "./utils";

const ADDR = (import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`) || "0x0000000000000000000000000000000000000000";
const ABI = [
  { name: "post", type: "function", stateMutability: "nonpayable", inputs: [{ name: "content", type: "string" }], outputs: [{ type: "uint256" }] },
  { name: "echo", type: "function", stateMutability: "nonpayable", inputs: [{ name: "originalId", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { name: "getFeed", type: "function", stateMutability: "view", inputs: [{ name: "count", type: "uint256" }], outputs: [{ type: "tuple[]", components: [{ name: "id", type: "uint256" }, { name: "author", type: "address" }, { name: "content", type: "string" }, { name: "timestamp", type: "uint256" }, { name: "echoCount", type: "uint256" }, { name: "echoOf", type: "uint256" }] }] },
  { name: "totalMessages", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

const AC = "#06b6d4";

export default function App() {
  const { isConnected, address } = useAccount();
  const [content, setContent] = useState(""); const [done, setDone] = useState(false);

  const { data: feed, refetch } = useReadContract({ address: ADDR, abi: ABI, functionName: "getFeed", args: [BigInt(30)], query: { refetchInterval: 8000 } });
  const { data: total } = useReadContract({ address: ADDR, abi: ABI, functionName: "totalMessages" });

  const { data: hash, isPending, writeContract, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  if (isSuccess && !done) { setDone(true); refetch(); setContent(""); setTimeout(() => setDone(false), 3000); }
  const isLoading = isPending || isConfirming;

  const msgs = (feed as any[]) ?? [];
  const charLeft = 280 - content.length;

  return (
    <div className="min-h-screen bg-[#080b14]">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 z-50 bg-[#080b14]/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔁</span>
          <span className="font-bold text-white text-lg" style={{ color: AC }}>Amplify</span>
          <span className="hidden sm:block text-xs text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded-full border border-slate-700">Arc Testnet</span>
        </div>
        <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
      </header>
      <main className="relative z-10 max-w-xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🔁</div>
          <h1 className="text-4xl font-black text-white mb-3"><span style={{ color: AC }}>Amplify</span> Your Voice</h1>
          <p className="text-slate-400 text-sm">Post and echo messages on-chain. Every word is permanent on Arc.</p>
          <div className="mt-3 inline-flex items-center gap-2 bg-slate-800/60 px-4 py-2 rounded-full border border-slate-700 text-slate-400 text-sm">{total?.toString() ?? "0"} messages on Arc</div>
        </div>

        {!isConnected ? <div className="text-center py-6 text-slate-500">Connect wallet to post</div> : (
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 mb-5">
            <textarea value={content} onChange={e => setContent(e.target.value.slice(0, 280))} placeholder="What's on your mind? (280 chars max)" rows={3}
              className="w-full bg-transparent text-white text-sm outline-none resize-none mb-3 placeholder-slate-600" />
            <div className="flex items-center justify-between">
              <span className={`text-xs ${charLeft < 20 ? "text-red-400" : "text-slate-600"}`}>{charLeft}</span>
              {done ? <span className="text-sm font-bold" style={{ color: AC }}>✅ Posted!</span>
                : <button onClick={() => writeContract({ address: ADDR, abi: ABI, functionName: "post", args: [content] })} disabled={isLoading || !content} className="px-5 py-2 rounded-xl font-bold text-sm text-black disabled:opacity-50" style={{ background: AC }}>{isLoading ? (isPending ? "Confirm..." : "Posting...") : "📣 Post"}</button>}
            </div>
            {error && <p className="mt-2 text-red-400 text-xs">{error.message?.includes("User rejected") ? "Cancelled" : error.message?.slice(0, 80)}</p>}
          </div>
        )}

        <div className="space-y-3">
          {msgs.map((m: any, i: number) => {
            const isEcho = Number(m.echoOf) > 0;
            return (
              <div key={i} className={`bg-slate-900/60 border rounded-2xl p-4 ${isEcho ? "border-cyan-500/20" : "border-white/8"}`}>
                {isEcho && <p className="text-xs mb-2" style={{ color: AC }}>🔁 Echo of #{Number(m.echoOf) - 1}</p>}
                <p className="text-white text-sm mb-3 leading-relaxed">{m.content}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-xs">{shortAddr(m.author)}</span>
                    <span className="text-slate-700 text-xs">·</span>
                    <span className="text-slate-600 text-xs">{formatDistanceToNow(Number(m.timestamp))}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {Number(m.echoCount) > 0 && <span className="text-xs" style={{ color: AC }}>🔁 {m.echoCount.toString()}</span>}
                    {isConnected && !isEcho && address?.toLowerCase() !== m.author?.toLowerCase() && (
                      <button onClick={() => writeContract({ address: ADDR, abi: ABI, functionName: "echo", args: [m.id] })}
                        className="text-xs px-3 py-1 rounded-lg border transition-all hover:text-white" style={{ borderColor: `${AC}40`, color: "#64748b" }}>
                        🔁 Echo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {msgs.length === 0 && <div className="text-center py-10 text-slate-500">No messages yet — post the first one!</div>}
        </div>
        <footer className="mt-10 text-center text-xs text-slate-600"><p>Amplify · <a href={`https://testnet.arcscan.app/address/${ADDR}`} target="_blank" rel="noreferrer" className="hover:text-slate-400">{ADDR.slice(0,6)}...{ADDR.slice(-4)}</a> · Chain {arcTestnet.id}</p></footer>
      </main>
    </div>
  );
}
