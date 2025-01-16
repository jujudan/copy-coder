import { NextRequest } from "next/server";
import { generatePrompt } from '@/lib/gemini'

export const maxDuration = 120


export async function POST(
    req: NextRequest,
  ) {
    const { image, applicationType, temperature } = await req.json();
    // console.log(stream, await stream.json());
    const response = await generatePrompt(image, applicationType, temperature);
    return generatePrompt(image, applicationType, temperature);
}
// export const GET = handle;