import { NextResponse } from "next/server"

import { blockIds, getLoadedBlockCodeFiles } from "@/lib/block-code-samples"

export const dynamic = "force-static"
export const dynamicParams = false
export const revalidate = false

export function generateStaticParams() {
  return blockIds.map((block) => ({ block }))
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ block: string }> }
) {
  const { block } = await params
  const files = await getLoadedBlockCodeFiles(block)

  if (!files) {
    return NextResponse.json({ error: "Unknown block" }, { status: 404 })
  }

  return NextResponse.json(files)
}
