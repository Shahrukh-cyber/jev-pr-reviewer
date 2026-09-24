import { BookOpen, Bug, CircleDashed, PackagePlus, Shapes, Tag } from "lucide-react";
import { Badge, Eyebrow } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatPercent } from "@/lib/review/format";
import type { TypeDecision } from "@/lib/review/model";
import { Distribution } from "./probability-bar";

const TYPE_ICONS: Record<string, typeof Bug> = {
  bug: Bug,
  feature: PackagePlus,
  refactor: Shapes,
  documentation: BookOpen,
  other: CircleDashed,
};

export function TypeCard({ type }: { type: TypeDecision }) {
  const Icon = TYPE_ICONS[type.choice] ?? Tag;
  return (
    <Card aria-labelledby="type-title" className="flex flex-col motion-safe:animate-rise" style={{ animationDelay: "120ms" }}>
      <CardHeader
        id="type-title"
        icon={<Tag />}
        title="PR Type"
        description="Choice answer with a probability for each category."
        action={<Badge>{formatPercent(type.confidence)} confidence</Badge>}
      />
      <CardBody className="flex flex-1 flex-col">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl border border-accent-line bg-accent-soft text-accent-text">
            <Icon className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-2xl font-semibold tracking-tight text-fg">{type.label}</p>
            <p className="text-[13px] text-fg-muted">{type.summary}</p>
          </div>
        </div>
        {type.criterion && (
          <div className="mt-4 rounded-lg border border-line bg-surface-2/60 px-3 py-2.5">
            <Eyebrow>Matched criterion</Eyebrow>
            <p className="mt-1 text-[13px] text-fg">
              <code className="font-mono text-xs text-accent-text">{type.choice}</code>
              <span className="text-fg-subtle"> — </span>
              {type.criterion}
            </p>
          </div>
        )}
        <Eyebrow className="mt-6 mb-3">Type probabilities</Eyebrow>
        <Distribution entries={type.distribution} label="PR type probability distribution" />
      </CardBody>
    </Card>
  );
}
