"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";

export type JobStatus = "queued" | "processing" | "completed" | "failed";

export type Job = {
  id: number | string;
  status: JobStatus;
  errorMessage?: string | null;
  createdAt?: string;
  startedAt?: string;
  completedAt?: string;
};

const statusMeta: Record<
  JobStatus,
  {
    label: string;
    tone: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  queued: { label: "Queued", tone: "bg-amber-100 text-amber-900", icon: Clock },
  processing: {
    label: "Processing",
    tone: "bg-blue-100 text-blue-900",
    icon: Loader2,
  },
  completed: {
    label: "Completed",
    tone: "bg-emerald-100 text-emerald-900",
    icon: CheckCircle2,
  },
  failed: { label: "Failed", tone: "bg-red-100 text-red-900", icon: XCircle },
};

interface JobMonitorProps {
  sourceId: string;
  refreshToken?: number;
}

export function JobMonitor({ sourceId, refreshToken }: JobMonitorProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sortedJobs = useMemo(
    () =>
      [...jobs].sort((a, b) => {
        const aDate = new Date(a.createdAt ?? 0).getTime();
        const bDate = new Date(b.createdAt ?? 0).getTime();
        return bDate - aDate;
      }),
    [jobs]
  );

  const summary = useMemo(() => {
    const counts: Record<JobStatus, number> = {
      queued: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };
    jobs.forEach((job) => {
      counts[job.status] += 1;
    });
    return counts;
  }, [jobs]);

  useEffect(() => {
    let active = true;
    const fetchJobs = async () => {
      try {
        const data = await api.get<Job[]>(
          `ingestion/data-sources/${sourceId}/jobs`
        );
        if (!active) return;
        setJobs(data);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError((err as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchJobs();
    // Poll every 3s to avoid socket complexity
    const interval = setInterval(fetchJobs, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [sourceId, refreshToken]);

  return (
    <Card className="mt-10 overflow-hidden border border-slate-200 shadow-xl">
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-lg">Job Monitor</CardTitle>
          <p className="text-sm text-slate-200/80">Live ingestion activity</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <Badge className="bg-white/10 text-white border-white/20">
            Source {sourceId}
          </Badge>
          <Badge className="bg-emerald-500 text-white border-emerald-400/60">
            Auto-refresh 3s
          </Badge>
        </div>
      </div>
      <CardContent className="bg-white">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-6">
          {(
            [
              ["queued", "Queued"],
              ["processing", "Processing"],
              ["completed", "Done"],
              ["failed", "Failed"],
            ] as const
          ).map(([key, label]) => {
            const meta = statusMeta[key];
            return (
              <div
                key={key}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm"
              >
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <meta.icon className="h-4 w-4" />
                  <span>{label}</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">
                  {summary[key]}
                </span>
              </div>
            );
          })}
        </div>
        <Separator className="mb-4" />

        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading jobs...
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {!loading && !error && sortedJobs.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No jobs yet. Trigger an ingestion to see live updates.
          </div>
        )}

        {!loading && !error && sortedJobs.length > 0 && (
          <div className="space-y-3">
            {sortedJobs.map((job) => {
              const meta = statusMeta[job.status] ?? statusMeta.queued;
              const Icon = meta.icon;
              return (
                <div
                  key={job.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between bg-white shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${meta.tone}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        Job #{job.id}
                      </div>
                      <div className="text-xs text-slate-500">
                        {job.createdAt
                          ? new Date(job.createdAt).toLocaleString()
                          : "Scheduled"}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-2 md:items-end">
                    <Badge className={`${meta.tone} border-transparent`}>
                      {meta.label}
                    </Badge>
                    {job.status === "processing" && (
                      <Progress
                        value={65}
                        className="w-full md:w-64 animate-pulse"
                      />
                    )}
                    {job.status === "failed" && job.errorMessage && (
                      <div className="text-xs text-red-700 text-left md:text-right">
                        {job.errorMessage}
                      </div>
                    )}
                    {job.status === "completed" && job.completedAt && (
                      <div className="text-xs text-slate-500 text-left md:text-right">
                        Finished {new Date(job.completedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
