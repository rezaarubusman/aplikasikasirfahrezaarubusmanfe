import type { Route } from "./+types/home";
import LoginPage from "../pages/login";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Login - Aplikasi Kasir" },
    { name: "description", content: "Silakan login untuk mengakses sistem kasir." },
  ];
}

export default function Home() {
  return <LoginPage />;
}
