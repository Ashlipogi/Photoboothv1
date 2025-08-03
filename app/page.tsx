"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Camera, Download, RotateCcw, Grid3X3, Rows3, Square, Facebook, Phone, Palette } from "lucide-react"

type Screen = "start" | "template" | "camera" | "preview"
type Template = "strip" | "grid" | "collage" | "single"

interface CapturedPhoto {
  id: string
  dataUrl: string
  timestamp: number
}

const templates = [
  { id: "strip", name: "Photo Strip", icon: Rows3, description: "3 vertical photos", photoCount: 3 },
  { id: "grid", name: "Grid Layout", icon: Grid3X3, description: "2x2 photo grid", photoCount: 4 },
  { id: "collage", name: "Collage Style", icon: Square, description: "Creative layout", photoCount: 3 },
  { id: "single", name: "Single Shot", icon: Camera, description: "One large photo", photoCount: 1 },
]

const backgrounds = [
  { id: "white", name: "White", color: "#ffffff" },
  { id: "black", name: "Black", color: "#000000" },
  { id: "gray", name: "Gray", color: "#6b7280" },
  {
    id: "pattern",
    name: "Pattern",
    color: "repeating-linear-gradient(45deg, #000 0px, #000 10px, #fff 10px, #fff 20px)",
  },
]

export default function PhotoboothSystem() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("start")
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([])
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [selectedBackground, setSelectedBackground] = useState("white")
  const [templateStyle, setTemplateStyle] = useState({
    borderWidth: 2,
    spacing: 4,
    cornerRadius: 0,
  })
  const [finalImageUrl, setFinalImageUrl] = useState<string>("")

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
      }
    } catch (error) {
      console.error("Error accessing camera:", error)
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const video = videoRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx) return

    // Use higher resolution for better quality
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Ensure high quality rendering
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Use maximum quality for JPEG compression
    const dataUrl = canvas.toDataURL("image/jpeg", 1.0)
    const newPhoto: CapturedPhoto = {
      id: Date.now().toString(),
      dataUrl,
      timestamp: Date.now(),
    }

    setCapturedPhotos((prev) => [...prev, newPhoto])
    setCurrentPhotoIndex((prev) => prev + 1)
  }, [])

  const startCountdown = useCallback(() => {
    setCountdown(3)
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer)
          capturePhoto()
          return null
        }
        return prev - 1
      })
    }, 1000)
  }, [capturePhoto])

  const resetPhotos = useCallback(() => {
    setCapturedPhotos([])
    setCurrentPhotoIndex(0)
  }, [])

  const downloadImage = useCallback((dataUrl: string, filename: string) => {
    const link = document.createElement("a")
    link.download = filename
    link.href = dataUrl
    link.click()
  }, [])

  const generateFinalImage = useCallback(() => {
    return new Promise<string>((resolve) => {
      if (!selectedTemplate || capturedPhotos.length === 0) {
        resolve("")
        return
      }

      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        resolve("")
        return
      }

      // Use higher resolution for better quality
      canvas.width = 1600 // Doubled from 800
      canvas.height = selectedTemplate === "strip" ? 2400 : 1600 // Doubled accordingly

      // Enable high quality rendering
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "high"

      // Apply background
      const bg = backgrounds.find((b) => b.id === selectedBackground)
      if (bg) {
        if (bg.id === "pattern") {
          const patternCanvas = createPatternCanvas()
          const pattern = ctx.createPattern(patternCanvas, "repeat")
          ctx.fillStyle = pattern || "#ffffff"
        } else {
          ctx.fillStyle = bg.color
        }
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      // Load and draw all images
      let loadedCount = 0
      const totalImages = capturedPhotos.length

      capturedPhotos.forEach((photo, index) => {
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => {
          let x = 0,
            y = 0,
            width = 0,
            height = 0

          switch (selectedTemplate) {
            case "strip":
              width = canvas.width - templateStyle.spacing * 4 // Adjusted for higher resolution
              height = (canvas.height - templateStyle.spacing * 8) / 3
              x = templateStyle.spacing * 2
              y = templateStyle.spacing * 2 + (height + templateStyle.spacing * 2) * index
              break
            case "grid":
              width = (canvas.width - templateStyle.spacing * 6) / 2
              height = (canvas.height - templateStyle.spacing * 6) / 2
              x = templateStyle.spacing * 2 + (width + templateStyle.spacing * 2) * (index % 2)
              y = templateStyle.spacing * 2 + (height + templateStyle.spacing * 2) * Math.floor(index / 2)
              break
            case "collage":
              if (index === 0) {
                width = canvas.width / 2 - templateStyle.spacing * 2
                height = canvas.height - templateStyle.spacing * 4
                x = templateStyle.spacing * 2
                y = templateStyle.spacing * 2
              } else {
                width = canvas.width / 2 - templateStyle.spacing * 2
                height = (canvas.height - templateStyle.spacing * 6) / 2
                x = canvas.width / 2 + templateStyle.spacing
                y = templateStyle.spacing * 2 + (height + templateStyle.spacing * 2) * (index - 1)
              }
              break
            case "single":
              width = canvas.width - templateStyle.spacing * 4
              height = canvas.height - templateStyle.spacing * 4
              x = templateStyle.spacing * 2
              y = templateStyle.spacing * 2
              break
          }

          // Draw border with adjusted thickness
          if (templateStyle.borderWidth > 0) {
            ctx.fillStyle = "#000000"
            ctx.fillRect(
              x - templateStyle.borderWidth * 2,
              y - templateStyle.borderWidth * 2,
              width + templateStyle.borderWidth * 4,
              height + templateStyle.borderWidth * 4,
            )
          }

          ctx.drawImage(img, x, y, width, height)

          loadedCount++
          if (loadedCount === totalImages) {
            // Use maximum quality for final image
            resolve(canvas.toDataURL("image/jpeg", 1.0))
          }
        }
        img.src = photo.dataUrl
      })
    })
  }, [selectedTemplate, capturedPhotos, selectedBackground, templateStyle])

  const createPatternCanvas = () => {
    const patternCanvas = document.createElement("canvas")
    patternCanvas.width = 20
    patternCanvas.height = 20
    const patternCtx = patternCanvas.getContext("2d")
    if (patternCtx) {
      patternCtx.fillStyle = "#000000"
      patternCtx.fillRect(0, 0, 10, 10)
      patternCtx.fillRect(10, 10, 10, 10)
      patternCtx.fillStyle = "#ffffff"
      patternCtx.fillRect(10, 0, 10, 10)
      patternCtx.fillRect(0, 10, 10, 10)
    }
    return patternCanvas
  }

  useEffect(() => {
    if (currentScreen === "camera") {
      startCamera()
    } else {
      stopCamera()
    }

    return () => stopCamera()
  }, [currentScreen, startCamera, stopCamera])

  useEffect(() => {
    if (currentScreen === "preview" && capturedPhotos.length > 0) {
      generateFinalImage().then(setFinalImageUrl)
    }
  }, [currentScreen, capturedPhotos, selectedBackground, templateStyle, generateFinalImage])

  const renderStartScreen = () => (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
      <Card className="w-full max-w-2xl border-4 border-black">
        <CardHeader className="text-center border-b-4 border-black">
          <CardTitle className="text-6xl font-black tracking-tighter mb-4">PHOTOBOOTH</CardTitle>
          <p className="text-2xl font-bold">INSTANT MEMORIES</p>
        </CardHeader>
        <CardContent className="p-12 space-y-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-xl font-bold">
              <Phone className="w-6 h-6" />
              <span>+1 (555) 123-4567</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-xl font-bold">
              <Facebook className="w-6 h-6" />
              <span>@PhotoboothPro</span>
            </div>
          </div>
          <Separator className="border-2 border-black" />
          <Button
            onClick={() => setCurrentScreen("template")}
            className="w-full h-20 text-3xl font-black bg-black hover:bg-gray-800 border-4 border-black"
          >
            START SESSION
          </Button>
        </CardContent>
      </Card>
    </div>
  )

  const renderTemplateScreen = () => (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black mb-4">CHOOSE TEMPLATE</h1>
          <p className="text-xl font-bold">SELECT YOUR PHOTO LAYOUT</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {templates.map((template) => {
            const Icon = template.icon
            return (
              <Card
                key={template.id}
                className="border-4 border-black cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => {
                  setSelectedTemplate(template.id as Template)
                  setCurrentScreen("camera")
                }}
              >
                <CardHeader className="text-center border-b-4 border-black">
                  <Icon className="w-16 h-16 mx-auto mb-4" />
                  <CardTitle className="text-2xl font-black">{template.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-6 text-center">
                  <p className="font-bold mb-4">{template.description}</p>
                  <Badge variant="outline" className="border-2 border-black font-bold">
                    {template.photoCount} PHOTOS
                  </Badge>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="text-center mt-12">
          <Button
            onClick={() => setCurrentScreen("start")}
            variant="outline"
            className="border-4 border-black font-black text-xl px-8 py-4"
          >
            BACK
          </Button>
        </div>
      </div>
    </div>
  )

  const renderCameraScreen = () => {
    const template = templates.find((t) => t.id === selectedTemplate)
    const remainingPhotos = template ? template.photoCount - capturedPhotos.length : 0

    return (
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black mb-2">
              PHOTO {currentPhotoIndex + 1} OF {template?.photoCount}
            </h1>
            <p className="text-xl font-bold">{template?.name.toUpperCase()}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="border-4 border-black">
                <CardContent className="p-4 relative">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-96 object-cover bg-black" />
                  <canvas ref={canvasRef} className="hidden" />

                  {countdown && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-white text-9xl font-black drop-shadow-2xl">{countdown}</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex gap-4 mt-6">
                <Button
                  onClick={startCountdown}
                  disabled={countdown !== null || remainingPhotos === 0}
                  className="flex-1 h-16 text-2xl font-black bg-black hover:bg-gray-800"
                >
                  <Camera className="w-6 h-6 mr-2" />
                  {countdown ? "TAKING..." : "TAKE PHOTO"}
                </Button>

                <Button
                  onClick={resetPhotos}
                  variant="outline"
                  className="h-16 px-8 border-4 border-black font-black text-xl bg-transparent"
                >
                  <RotateCcw className="w-6 h-6 mr-2" />
                  RETRY
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              <Card className="border-4 border-black">
                <CardHeader className="border-b-4 border-black">
                  <CardTitle className="text-xl font-black">CAPTURED PHOTOS</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from({ length: template?.photoCount || 0 }).map((_, index) => (
                      <div
                        key={index}
                        className="aspect-square border-2 border-black bg-gray-100 flex items-center justify-center"
                      >
                        {capturedPhotos[index] ? (
                          <img
                            src={capturedPhotos[index].dataUrl || "/placeholder.svg"}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-500 font-bold">{index + 1}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {remainingPhotos === 0 && (
                <Button
                  onClick={() => setCurrentScreen("preview")}
                  className="w-full h-16 text-xl font-black bg-black hover:bg-gray-800"
                >
                  PREVIEW & CUSTOMIZE
                </Button>
              )}
            </div>
          </div>

          <div className="text-center mt-8">
            <Button
              onClick={() => setCurrentScreen("template")}
              variant="outline"
              className="border-4 border-black font-black text-xl px-8 py-4"
            >
              BACK TO TEMPLATES
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const renderPreviewScreen = () => {
    return (
      <div className="min-h-screen bg-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black mb-2">PREVIEW & CUSTOMIZE</h1>
            <p className="text-xl font-bold">ADJUST YOUR PHOTO LAYOUT</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="border-4 border-black">
                <CardContent className="p-4">
                  <div className="aspect-square bg-gray-100 border-2 border-black flex items-center justify-center">
                    {finalImageUrl ? (
                      <img
                        src={finalImageUrl || "/placeholder.svg"}
                        alt="Final preview"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <span className="text-gray-500 font-bold">GENERATING PREVIEW...</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-4 mt-6">
                <Button
                  onClick={() => {
                    if (finalImageUrl) {
                      downloadImage(finalImageUrl, `photobooth-${Date.now()}.jpg`)
                    }
                  }}
                  className="flex-1 h-16 text-2xl font-black bg-black hover:bg-gray-800"
                >
                  <Download className="w-6 h-6 mr-2" />
                  DOWNLOAD TEMPLATE
                </Button>

                <Button
                  onClick={() => {
                    capturedPhotos.forEach((photo, index) => {
                      downloadImage(photo.dataUrl, `photo-${index + 1}-${Date.now()}.jpg`)
                    })
                  }}
                  variant="outline"
                  className="h-16 px-8 border-4 border-black font-black text-xl"
                >
                  <Download className="w-6 h-6 mr-2" />
                  ALL PHOTOS
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              <Card className="border-4 border-black">
                <CardHeader className="border-b-4 border-black">
                  <CardTitle className="text-xl font-black flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    BACKGROUND
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <Select value={selectedBackground} onValueChange={setSelectedBackground}>
                    <SelectTrigger className="border-2 border-black font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {backgrounds.map((bg) => (
                        <SelectItem key={bg.id} value={bg.id} className="font-bold">
                          {bg.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card className="border-4 border-black">
                <CardHeader className="border-b-4 border-black">
                  <CardTitle className="text-xl font-black">STYLE</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-6">
                  <div>
                    <label className="block text-sm font-bold mb-2">BORDER WIDTH</label>
                    <Slider
                      value={[templateStyle.borderWidth]}
                      onValueChange={([value]) => setTemplateStyle((prev) => ({ ...prev, borderWidth: value }))}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                    <span className="text-sm font-bold">{templateStyle.borderWidth}px</span>
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2">SPACING</label>
                    <Slider
                      value={[templateStyle.spacing]}
                      onValueChange={([value]) => setTemplateStyle((prev) => ({ ...prev, spacing: value }))}
                      max={20}
                      step={1}
                      className="w-full"
                    />
                    <span className="text-sm font-bold">{templateStyle.spacing}px</span>
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={() => {
                  setCapturedPhotos([])
                  setCurrentPhotoIndex(0)
                  setSelectedTemplate(null)
                  setCurrentScreen("start")
                }}
                variant="outline"
                className="w-full h-12 border-4 border-black font-black"
              >
                NEW SESSION
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="font-mono">
      {currentScreen === "start" && renderStartScreen()}
      {currentScreen === "template" && renderTemplateScreen()}
      {currentScreen === "camera" && renderCameraScreen()}
      {currentScreen === "preview" && renderPreviewScreen()}
    </div>
  )
}
