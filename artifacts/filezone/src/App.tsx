import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";

import { MainLayout } from "@/components/layout/MainLayout";
import { ThemeProvider } from "next-themes";
import { CookieBanner } from "@/components/CookieBanner";

const Home = lazy(() => import("@/pages/Home").then(m => ({ default: m.Home })));
const CategoryPage = lazy(() => import("@/pages/CategoryPage").then(m => ({ default: m.CategoryPage })));
const ToolPage = lazy(() => import("@/pages/ToolPage").then(m => ({ default: m.ToolPage })));
const About = lazy(() => import("@/pages/About").then(m => ({ default: m.About })));
const AdminPage = lazy(() => import("@/pages/AdminPage").then(m => ({ default: m.AdminPage })));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy").then(m => ({ default: m.PrivacyPolicy })));
const TermsOfService = lazy(() => import("@/pages/TermsOfService").then(m => ({ default: m.TermsOfService })));
const CookiePolicy = lazy(() => import("@/pages/CookiePolicy").then(m => ({ default: m.CookiePolicy })));
const ContactUs = lazy(() => import("@/pages/ContactUs").then(m => ({ default: m.ContactUs })));
const FAQ = lazy(() => import("@/pages/FAQ").then(m => ({ default: m.FAQ })));
const BlogIndex = lazy(() => import("@/pages/BlogIndex").then(m => ({ default: m.BlogIndex })));
const BlogDetail = lazy(() => import("@/pages/BlogDetail").then(m => ({ default: m.BlogDetail })));
const ArticleDetail = lazy(() => import("@/pages/ArticleDetail").then(m => ({ default: m.ArticleDetail })));
const NotFound = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Suspense fallback={
      <div className="flex flex-col justify-center items-center h-[60vh] bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground mt-4 animate-pulse">Loading secure tool workspace...</p>
      </div>
    }>
      <Switch>
        <Route path="/admin" component={AdminPage} />
        <Route>
          <MainLayout>
            <Suspense fallback={
              <div className="flex flex-col justify-center items-center h-[50vh] bg-background">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                <p className="text-xs text-muted-foreground mt-3 animate-pulse">Loading page components...</p>
              </div>
            }>
              <Switch>
                <Route path="/" component={Home} />
                <Route path="/home">{() => <Redirect to="/" />}</Route>
                <Route path="/pdf" component={() => <CategoryPage category="pdf" />} />
                <Route path="/image" component={() => <CategoryPage category="image" />} />
                <Route path="/convert" component={() => <CategoryPage category="convert" />} />
                <Route path="/calculator" component={() => <CategoryPage category="calculator" />} />
                <Route path="/text" component={() => <CategoryPage category="text" />} />
                <Route path="/tools/:slug" component={ToolPage} />
                <Route path="/blog" component={BlogIndex} />
                <Route path="/blog/:slug" component={BlogDetail} />
                <Route path="/articles/:slug" component={ArticleDetail} />
                <Route path="/about" component={About} />
                <Route path="/privacy" component={PrivacyPolicy} />
                <Route path="/terms" component={TermsOfService} />
                <Route path="/cookie-policy" component={CookiePolicy} />
                <Route path="/contact" component={ContactUs} />
                <Route path="/faq" component={FAQ} />
                <Route component={NotFound} />
              </Switch>
            </Suspense>
          </MainLayout>
        </Route>
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
            <CookieBanner />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
