import { Children, createElement, isValidElement } from "react";

/**
 * Compose providers sequentially inside each other to avoid nesting.
 *
 * Example:
 *
 * ```tsx
 * <ComposeChildren>
 *   <ThemeProvider theme={theme} />
 *   <AuthProvider />
 *   <QueryClientProvider client={queryClient} />
 *   {children}
 * </ComposeChildren>
 * ```
 * equals to
 * ```tsx
 * <ThemeProvider theme={theme}>
 *   <AuthProvider>
 *     <QueryClientProvider client={queryClient}>
 *       {children}
 *     </QueryClientProvider>
 *   </AuthProvider>
 * </ThemeProvider>
 * ```
 */
export function ComposeChildren({ children }: React.PropsWithChildren) {
  const array = Children.toArray(children);
  const last = array.pop();
  return (
    <>
      {array.reduceRight(
        (child, element) =>
          isValidElement(element)
            ? createElement(element.type, element.props, child)
            : child,
        last,
      )}
    </>
  );
}
