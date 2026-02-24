import { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { SessionProvider } from "next-auth/react";

interface MockSession {
  user?: { id: string; name?: string; email?: string };
  expires: string;
}

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  session?: MockSession | null;
}

export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const { session = null, ...renderOptions } = options;

  return render(ui, {
    wrapper: ({ children }) => (
      <SessionProvider session={session as never}>{children}</SessionProvider>
    ),
    ...renderOptions,
  });
}

export function createMockFile(
  content: string,
  name: string,
  type: string
): File {
  return new File([content], name, { type });
}

export function createMockFormData(
  data: Record<string, string | File>
): FormData {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });
  return formData;
}
