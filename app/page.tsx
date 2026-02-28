"use client";

import { useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { Loader2, Sparkles, ArrowDown, AlertTriangle } from "lucide-react";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Header } from "@/components/layout/Header";
import { StepIndicator } from "@/components/layout/StepIndicator";
import { Footer } from "@/components/layout/Footer";
import { DropZone } from "@/components/upload/DropZone";
import { ImagePreview } from "@/components/upload/ImagePreview";
import { SelectionOverlay } from "@/components/canvas/SelectionOverlay";
import { CompareSlider } from "@/components/results/CompareSlider";
import { ResultPanel } from "@/components/results/ResultPanel";
import { DownloadBar } from "@/components/results/DownloadBar";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore";
import { useExtraction } from "@/hooks/useExtraction";
import type { GarmentImage, PerspectivePoints } from "@/types";

// Animation variants for section transitions
const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
};

export default function Home() {
  const store = useAppStore();
  const {
    detect,
    processSelection,
    isLoading,
    progress,
    stepMessage,
    error,
    retry,
  } = useExtraction();

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (store.image?.dataUrl) {
        URL.revokeObjectURL(store.image.dataUrl);
      }
    };
  }, [store.image?.dataUrl]);

  // Handle image selection from DropZone
  const handleImageSelected = useCallback(
    (image: GarmentImage) => {
      store.setImage(image);
    },
    [store]
  );

  // Handle "Extract Design" button — starts Phase 1 (detection only)
  const handleExtract = useCallback(() => {
    if (store.image) {
      detect(store.image);
    }
  }, [store.image, detect]);

  // Handle selection confirmation from overlay — starts Phase 2 (process + bg removal)
  const handleConfirmSelection = useCallback(
    (adjustedPoints: PerspectivePoints | null) => {
      if (!store.image || !store.detection) return;
      if (adjustedPoints) {
        store.setAdjustedPoints(adjustedPoints);
      }
      processSelection(store.image, store.detection, adjustedPoints);
    },
    [store, processSelection]
  );

  // Handle re-detection — runs detect again with the same image
  const handleRedetect = useCallback(() => {
    if (store.image) {
      detect(store.image);
    }
  }, [store.image, detect]);

  // Handle remove image
  const handleRemoveImage = useCallback(() => {
    if (store.image?.dataUrl) {
      URL.revokeObjectURL(store.image.dataUrl);
    }
    store.reset();
  }, [store]);

  // Handle start over
  const handleStartOver = useCallback(() => {
    store.reset();
  }, [store]);

  // Determine which section to show
  const showUpload = !store.image;
  const showPreview = store.image && store.processingStep === "upload";
  const showDetecting = isLoading && store.processingStep === "detecting";
  const showOverlay = store.detection && store.processingStep === "detected" && !isLoading;
  const showProcessing = isLoading && (store.processingStep === "processing" || store.processingStep === "removing-bg");
  const showResults = store.finalImageUrl && store.processingStep === "complete";
  const showError = store.error && !isLoading;

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <div className="flex flex-col min-h-screen">
          {/* Skip to content link for keyboard navigation */}
          <a href="#main-content" className="skip-link">Skip to content</a>

          <Header />

          {/* Screen reader announcements for state changes */}
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {isLoading && stepMessage}
            {error && `Error: ${error}`}
            {showResults && "Design extraction complete. Ready to download."}
          </div>

          <main id="main-content" className="flex-1 flex flex-col items-center px-4 sm:px-6 pb-12">
            {/* Step indicator */}
            <div className="w-full max-w-xl">
              <StepIndicator currentStep={store.currentStep} />
            </div>

            {/* Hero section — only when no image */}
            <AnimatePresence mode="wait">
              {showUpload && (
                <motion.div
                  key="hero"
                  variants={sectionVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="text-center mt-6 mb-8 max-w-2xl"
                >
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-3">
                    Extract prints from{" "}
                    <span className="gradient-text">any garment</span>
                  </h1>
                  <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
                    Upload a photo of a t-shirt, hoodie, or jacket — our AI detects the print,
                    removes the fabric, and gives you the clean, flat design.
                  </p>
                  <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-muted-foreground/60">
                    <Sparkles className="h-3 w-3" />
                    <span>Powered by Gemini 2.5 Pro Vision</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Content area */}
            <div className="w-full max-w-4xl mt-2">
              <AnimatePresence mode="wait">
                {/* Upload zone */}
                {showUpload && (
                  <motion.div
                    key="upload"
                    variants={sectionVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <DropZone onImageSelected={handleImageSelected} disabled={isLoading} />
                  </motion.div>
                )}

                {/* Image preview with extract button */}
                {showPreview && store.image && (
                  <motion.div
                    key="preview"
                    variants={sectionVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="flex flex-col items-center gap-4"
                  >
                    <ImagePreview
                      image={store.image}
                      onRemove={handleRemoveImage}
                    />
                    <Button
                      id="extract-btn"
                      size="lg"
                      className="gap-2 px-8"
                      onClick={handleExtract}
                    >
                      <Sparkles className="h-4 w-4" />
                      Extract Design
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </motion.div>
                )}

                {/* Detecting state (Gemini analyzing) */}
                {showDetecting && (
                  <motion.div
                    key="detecting"
                    variants={sectionVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="flex flex-col items-center gap-6 max-w-md mx-auto"
                  >
                    <div className="flex flex-col items-center gap-4 w-full">
                      <div className="relative">
                        <Loader2 className="h-12 w-12 text-primary animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-4 w-4 rounded-full bg-primary/20 animate-ping" />
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-medium">Analyzing with Gemini 3.0 Flash...</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Detecting print region on your garment
                        </p>
                      </div>
                      <Progress value={progress} className="w-full max-w-xs" />
                    </div>
                  </motion.div>
                )}

                {/* Detection overlay — user reviews/adjusts corners */}
                {showOverlay && store.image && store.detection && (
                  <motion.div
                    key="overlay"
                    variants={sectionVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <SelectionOverlay
                      image={store.image}
                      detection={store.detection}
                      onConfirm={handleConfirmSelection}
                      onRedetect={handleRedetect}
                    />
                  </motion.div>
                )}

                {/* Processing state (Sharp + bg removal) */}
                {showProcessing && (
                  <motion.div
                    key="processing"
                    variants={sectionVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="flex flex-col items-center gap-6 max-w-md mx-auto"
                  >
                    <div className="flex flex-col items-center gap-4 w-full">
                      <div className="relative">
                        <Loader2 className="h-12 w-12 text-primary animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-4 w-4 rounded-full bg-primary/20 animate-ping" />
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-medium">{stepMessage}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          This may take a moment...
                        </p>
                      </div>
                      <Progress value={progress} className="w-full max-w-xs" />
                      <span className="text-xs text-muted-foreground">{progress}%</span>
                    </div>
                  </motion.div>
                )}

                {/* Results */}
                {showResults && store.finalImageUrl && store.image && (
                  <motion.div
                    key="results"
                    variants={sectionVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="flex flex-col gap-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <CompareSlider
                        beforeSrc={store.image.dataUrl}
                        afterSrc={store.finalImageUrl}
                      />
                      <ResultPanel
                        imageUrl={store.finalImageUrl}
                        colorPalette={store.colorPalette}
                      />
                    </div>
                    <DownloadBar
                      imageUrl={store.finalImageUrl}
                      onStartOver={handleStartOver}
                    />
                  </motion.div>
                )}

                {/* Error state */}
                {showError && (
                  <motion.div
                    key="error"
                    variants={sectionVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="flex flex-col items-center gap-4 max-w-md mx-auto text-center"
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                      <AlertTriangle className="h-8 w-8 text-destructive" />
                    </div>
                    <p className="text-lg font-medium">{error}</p>
                    <div className="flex items-center gap-3">
                      {store.error?.retryable && (
                        <Button onClick={retry} className="gap-2">
                          <Sparkles className="h-4 w-4" />
                          Retry
                        </Button>
                      )}
                      <Button variant="outline" onClick={handleStartOver}>
                        Start Over
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </main>

          <Footer />
        </div>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
