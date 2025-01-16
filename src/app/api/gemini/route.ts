import { NextRequest } from "next/server";
import { generatePrompt } from '@/lib/gemini'

export const maxDuration = 120


export async function handle(
    req: NextRequest,
  ) {
    const { image, applicationType, temperature } = await req.json();
    // console.log(stream, await stream.json());
    return generatePrompt(image, applicationType, temperature);
}

export const POST = handle;
// export const GET = handle;