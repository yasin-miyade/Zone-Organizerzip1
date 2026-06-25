import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { MainLayout } from "@/components/layout/MainLayout";
import { Home } from "@/pages/Home";
import { CategoryPage } from "@/pages/CategoryPage";
import { ToolPage } from "@/pages/ToolPage";
import { About } from "@/pages/About";
import { AdminPage } from "@/pages/AdminPage";
import { PrivacyPolicy } from "@/pages/PrivacyPolicy";
import { TermsOfService } from "@/pages/TermsOfService";
import { ContactUs } from "@/pages/ContactUs";
import { FAQ } from "@/pages/FAQ";
import NotFound from "@/pages/not-found";

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
    <Switch>
      <Route path="/admin" component={AdminPage} />
      <Route>
        <MainLayout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/pdf" component={() => <CategoryPage category="pdf" />} />
            <Route path="/image" component={() => <CategoryPage category="image" />} />
            <Route path="/convert" component={() => <CategoryPage category="convert" />} />
            <Route path="/calculator" component={() => <CategoryPage category="calculator" />} />
            <Route path="/text" component={() => <CategoryPage category="text" />} />
            <Route path="/tools/:slug" component={ToolPage} />
            <Route path="/about" component={About} />
            <Route path="/privacy" component={PrivacyPolicy} />
            <Route path="/terms" component={TermsOfService} />
            <Route path="/contact" component={ContactUs} />
            <Route path="/faq" component={FAQ} />
            <Route component={NotFound} />
          </Switch>
        </MainLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
