'use client'

import { Upload, Copy, Check } from 'lucide-react'
import Image from 'next/image'
import { useState, useCallback, useEffect, useRef } from 'react'
// import { generatePromptAction } from './actions'

import { generatePrompt } from "@/lib/gemini";
import { Button } from '@/components/ui/button'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [applicationType, setApplicationType] = useState('web')
  const [temperature, setTemperature] = useState(0.2)
  const promptContainerRef = useRef<HTMLDivElement>(null)

  // Auto scroll to bottom when content updates
  useEffect(() => {
    if (promptContainerRef.current) {
      promptContainerRef.current.scrollTop = promptContainerRef.current.scrollHeight
    }
  }, [generatedPrompt])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const handleGeneratePrompt = useCallback(async () => {
    if (!selectedImage) return

    try {
      setIsGenerating(true)
      setGeneratedPrompt("")
      setError(null)
      // 去掉前缀 "data:image/png;base64,"，只保留 Base64 数据部分
      const image = selectedImage?.split(',')[1]
      const response = await fetch('/api/gemini', {
        method: 'POST',
        body: JSON.stringify({ image, applicationType, temperature }),
        headers: {
          'Content-Type': 'application/json',
        },
      })
    
      if (!response.ok) {
        const j = await response.json()
        console.log('response', j)
        return setError(`Failed to generate prompt: ${j.error.message}` )
      }
      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      if (!reader) return;
      while (true) {
        const {done, value} = await reader.read();
        if (done) {
          setIsGenerating(false)
          return
        };
        const data = decoder.decode(value) // 利用解码器把数据解析成字符串
        const dataStartIndex = data.indexOf("data: "); // 查找 'data: ' 开头的数据块
        const jsonStartIndex = dataStartIndex + 6; // 跳过 'data: '

        let startThought = false;
        let endThought = true;
        JSON.parse(data.slice(
            jsonStartIndex,
            data.length
        ))?.candidates?.at(0)?.content.parts?.map((part: {text: string, thought?: boolean})=> {

          let returnMessage = part.text;
          if (part?.thought) {
            if (!startThought) {
              startThought = true;
              endThought = false;
              returnMessage = `> ${returnMessage}`;
            }
            returnMessage = returnMessage.replace(/\n+/g, "\n> ");
            returnMessage = returnMessage.replace(/\n\n+/g, "\n");
          }
          if (!part.thought) {
            if (startThought && !endThought) {
              startThought = false;
              endThought = true;
              returnMessage = `\n\n${returnMessage}`;
            }
          }
          setGeneratedPrompt(prev => prev + returnMessage)
        })
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate prompt')
    } finally {
      setIsGenerating(false)
    }
  }, [selectedImage, applicationType, temperature])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const removeImage = useCallback(() => {
    setSelectedImage(null)
    setGeneratedPrompt(null)
    setError(null)
  }, [])

  const handleCopyPrompt = useCallback(async () => {
    if (!generatedPrompt) return

    try {
      await navigator.clipboard.writeText(generatedPrompt)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [generatedPrompt])

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="mb-12">
        <h1 className="text-5xl font-bold mb-6">
          UI 提示词生成器
        </h1>
        <h1 className="text-xl text-gray-600 mb-8">
        使用图片为 AI 编码器创建强大的提示词
        </h1>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div>
          <div className="bg-white p-8 rounded-xl border border-gray-200">
            <div className="text-center">
              {!selectedImage ? (
                <div
                  className={`relative border-2 ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'} border-dashed rounded-lg p-12 cursor-pointer hover:border-blue-500 transition-colors`}
                  onClick={() => document.getElementById('file-upload')?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="flex flex-col items-center">
                    <Upload className="h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-sm text-gray-600 mb-2">
                      拖拽图片到这里，或点击选择图片
                    </p>
                    <p className="text-gray-400 text-sm mt-2">
                      支持格式：JPG、PNG
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                    >
                      选择图片
                    </Button>
                  </div>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  <p className="mt-4 text-xs text-gray-400">
                    注意：一次只能上传一张图片。
                  </p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center z-20">
                    <button
                      onClick={removeImage}
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-red-500 hover:bg-red-600 text-white h-auto py-3 px-6 text-base font-medium"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x w-5 h-5">
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                      移除图片
                    </button>
                  </div>
                  <div className="relative w-full aspect-video">
                    <Image
                      src={selectedImage}
                      alt="Uploaded design"
                      fill
                      className="rounded-lg object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tools Section */}
          <div className="mt-8 bg-white p-8 rounded-xl border border-gray-200">
            <h3 className="font-semibold mb-4">Quick Access Tools:</h3>
            <div className="grid grid-cols-1 gap-3">
              <a
                href="https://bolt.new"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <span className="mr-2">⚡</span>
                <div>
                  <div className="font-medium">Bolt</div>
                  <div className="text-sm text-gray-300">Build full-stack web apps</div>
                </div>
              </a>
              <a
                href="https://v0.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
              >
                <span className="mr-2">🚀</span>
                <div>
                  <div className="font-medium">v0.dev</div>
                  <div className="text-sm text-violet-200">Design and build UI visually</div>
                </div>
              </a>
              <a
                href="https://cursor.sh"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <span className="mr-2">💻</span>
                <div>
                  <div className="font-medium">Cursor</div>
                  <div className="text-sm text-blue-200">AI-powered code editor</div>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-white p-8 rounded-xl border border-gray-200">
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">选择设计类型</h3>
            <select
              className="w-full p-2 border border-gray-300 rounded-lg"
              value={applicationType}
              onChange={(e) => setApplicationType(e.target.value)}
            >
              <option value="web">网页应用</option>
              <option value="mobile">移动端应用</option>
              <option value="desktop">桌面端应用</option>
            </select>
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">温度:</h3>
              <span className="text-sm text-gray-500">{temperature}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">精确性</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-blue-700"
              />
              <span className="text-sm text-gray-500">创造性</span>
            </div>
            <p className="mt-2 text-xs text-gray-500">
            调整温度以控制生成提示的创造性水平。较低的值会产生更集中的结果，而较高的值会增加创造性和可变性。
            </p>
          </div>

          <Button
            className="w-full mt-8"
            onClick={handleGeneratePrompt}
            disabled={!selectedImage || isGenerating}
          >
            {isGenerating ? '生成中……' : '生成提示词'}
          </Button>

          {error && (
            <p className="mt-4 text-sm text-red-500 text-center">
              {error}
            </p>
          )}

          {generatedPrompt && (
            <div className="mt-8 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h4 className="font-semibold">生成的提示词:</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyPrompt}
                  className="gap-2"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-green-500">已复制！</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>复制</span>
                    </>
                  )}
                </Button>
              </div>
              <div ref={promptContainerRef} className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar prose prose-sm max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  className="text-gray-600"
                >
                  {generatedPrompt}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
