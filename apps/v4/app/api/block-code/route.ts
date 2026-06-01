import { NextResponse } from "next/server"

import { getLoadedBlockCodeFile } from "@/lib/block-code-samples"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const blockId = searchParams.get("block")
  const targetPath = searchParams.get("file")

  if (!blockId || !targetPath) {
    return NextResponse.json(
      { error: "Missing block or file parameter." },
      { status: 400 }
    )
  }

  const file = await getLoadedBlockCodeFile({ blockId, targetPath })

  if (!file) {
    return NextResponse.json({ error: "File not found." }, { status: 404 })
  }

  return NextResponse.json(file)
}
