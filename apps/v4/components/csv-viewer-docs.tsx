"use client"

import * as React from "react"
import dynamic from "next/dynamic"

import { Spinner } from "@/components/ui/spinner"
import { DocsViewCodeBlock } from "@/components/docs-code-block"

const SAMPLE_CSV = `Invoice,Customer,Status,Amount,Submitted
INV-1001,Northstar Supply,Approved,4280.50,2026-04-28
INV-1002,Bluebird Medical,Needs review,1190.00,2026-04-29
INV-1003,Aster Logistics,Approved,845.75,2026-04-30
INV-1004,Juniper Foods,Exception,3499.99,2026-05-01
INV-1005,Keystone Labs,Approved,920.10,2026-05-02
INV-1006,Monarch Studio,Processing,1510.45,2026-05-03
INV-1007,Orchard Bank,Approved,7820.00,2026-05-04
INV-1008,Riverstone Energy,Needs review,632.25,2026-05-05
INV-1009,Summit Health,Approved,2730.00,2026-05-06
INV-1010,Westhaven Legal,Processing,410.80,2026-05-07`

function ViewerPreviewLoading() {
  return (
    <div className="grid h-[560px] place-items-center bg-background">
      <Spinner className="size-4" />
    </div>
  )
}

const CsvViewer = dynamic(
  () => import("@/components/ui/csv-viewer").then((mod) => mod.CsvViewer),
  {
    ssr: false,
    loading: () => <ViewerPreviewLoading />,
  }
)

export function CsvViewerPreviewClient() {
  return <CsvViewer data={SAMPLE_CSV} search />
}

const csvViewerUsageCode = `"use client";

import { CsvViewer } from "@/components/ui/csv-viewer";

const data = \`Invoice,Customer,Status,Amount
INV-1001,Northstar Supply,Approved,4280.50
INV-1002,Bluebird Medical,Needs review,1190.00\`;

export function CsvViewerExample() {
  return <CsvViewer data={data} search />;
}`

export function CsvViewerDemo() {
  return (
    <div
      data-slot="component-preview"
      className="group relative mt-4 mb-12 flex flex-col overflow-hidden rounded-xl border"
    >
      <CsvViewer data={SAMPLE_CSV} search />
      <DocsViewCodeBlock code={csvViewerUsageCode} />
    </div>
  )
}
