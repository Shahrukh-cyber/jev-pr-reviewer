import { ListTree } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { DecisionSignal } from "@/lib/review/model";

/**
 * "Why this result?" — shows the structured values behind every conclusion
 * on the page. It intentionally generates no prose explanations.
 */
export function DecisionSignals({ signals }: { signals: DecisionSignal[] }) {
  return (
    <Card aria-labelledby="signals-title" className="motion-safe:animate-rise" style={{ animationDelay: "240ms" }}>
      <CardHeader
        id="signals-title"
        icon={<ListTree />}
        title="Why this result? Decision signals"
        description="Every value below comes directly from Jev's structured response — no generated explanations."
      />
      <div className="mt-4 overflow-x-auto border-t border-line">
        <table className="w-full min-w-[560px] text-left text-[13px]">
          <caption className="sr-only">Jev response fields and how this review reads them</caption>
          <thead>
            <tr className="border-b border-line bg-surface-2/60 text-[11px] tracking-[0.06em] text-fg-subtle uppercase">
              <th scope="col" className="px-5 py-2 font-medium">Signal</th>
              <th scope="col" className="px-3 py-2 font-medium">Jev field</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Value</th>
              <th scope="col" className="px-5 py-2 font-medium">Reads as</th>
            </tr>
          </thead>
          <tbody>
            {signals.map((signal, index) => {
              const firstOfGroup = index === 0 || signals[index - 1].group !== signal.group;
              return (
                <tr
                  key={signal.field}
                  className={cn("border-line", firstOfGroup && index > 0 && "border-t")}
                >
                  <th scope="row" className="px-5 py-2 align-top font-medium whitespace-nowrap text-fg">
                    {firstOfGroup ? signal.group : <span className="sr-only">{signal.group}</span>}
                  </th>
                  <td className="px-3 py-2 align-top">
                    <code className="font-mono text-xs whitespace-nowrap text-fg-muted">{signal.field}</code>
                  </td>
                  <td className="px-3 py-2 text-right align-top">
                    <code
                      className={cn(
                        "rounded px-1.5 py-0.5 font-mono text-xs tabular-nums",
                        signal.highlight ? "bg-accent-soft font-semibold text-accent-text" : "text-fg-muted",
                      )}
                    >
                      {signal.value}
                    </code>
                  </td>
                  <td className={cn("px-5 py-2 align-top", signal.highlight ? "text-fg" : "text-fg-muted")}>
                    {signal.reading}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
