"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { ReaderProvider } from "@/components/reader/ReaderContext";
import {
  BookDataProvider,
  ReaderSettingsProvider,
  TtsProvider,
  AnnotationProvider,
  ReaderUIProvider,
  NavigationProvider,
} from "./index";
import { ReaderErrorBoundary } from "@/components/reader/ReaderErrorBoundary";

interface ReaderProvidersProps {
  children: React.ReactNode;
}

export function ReaderProviders({ children }: ReaderProvidersProps) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <ReaderProvider>
          <BookDataProvider>
            <ReaderSettingsProvider>
              <TtsProvider>
                <AnnotationProvider>
                  <ReaderUIProvider>
                    <NavigationProvider>
                      <ReaderErrorBoundary>
                        {children}
                      </ReaderErrorBoundary>
                    </NavigationProvider>
                  </ReaderUIProvider>
                </AnnotationProvider>
              </TtsProvider>
            </ReaderSettingsProvider>
          </BookDataProvider>
        </ReaderProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
