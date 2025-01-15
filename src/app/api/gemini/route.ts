import { NextRequest, NextResponse } from "next/server";
import { generatePrompt } from '@/lib/gemini'
import { log } from "console";

export async function handle(
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> },
  ) {
    const { image, applicationType, temperature } = await req.json();
    const stream = generatePrompt(image, applicationType, temperature);
    console.log(stream, stream.body); 
    return stream;
}

export const POST = handle;
// export const GET = handle;