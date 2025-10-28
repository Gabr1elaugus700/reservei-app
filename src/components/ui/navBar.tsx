
// "use client";
// import React from "react";
// import { useAuthGuard } from "@/hooks/useAuthGuard";
// import { usePathname } from "next/navigation";
// import { Button } from "@/components/ui/button";
// import { Menu } from "lucide-react";
// import Link from "next/link";
// import Image from "next/image";

// const navLinks = [
//   { name: "Início", href: "/capacity" },
//   { name: "Clientes", href: "/clientes" },
//   { name: "Serviços", href: "/servicos" },
//   { name: "Tarefas", href: "/tarefas" },
//   { name: "Relatórios", href: "/relatorios" },
//   { name: "Suportes", href: "/suportes" },
// ];

// export function AppHeader() {
//   const pathname = usePathname();
//   useAuthGuard();
//   if (pathname === "/login" || pathname === "/register") {
//     return null;
//   }
//   return (
//     <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-20 w-full">
//       <div className="flex items-center justify-between h-16 px-6 w-full max-w-[1800px] mx-auto">
//         {/* Logo/Nome do sistema à extrema esquerda */}
//         <div className="flex-shrink-0 flex items-center h-full w-[200px]">
//           <Image src="/logo.png" alt="Ambielle Logo" width={150} height={48} className="h-12 w-auto" />
//           <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">v1.0</span>
//         </div>

//         {/* Navegação desktop centralizada */}
//         <nav className="hidden md:flex items-center justify-center gap-6 flex-1 max-w-[800px]">
//           {navLinks.map((link) => (
//             <Link key={link.name} href={link.href} className="text-lg font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 hover:underline transition-colors">
//               {link.name}
//             </Link>
//           ))}
//         </nav>

//         {/* Ações à direita */}
//         <div className="flex items-center gap-4">
//           <Button 
//             onClick={() => {
//               localStorage.removeItem('token');
//               window.location.href = '/login';
//             }}
//             variant="outline" className="px-2 py-1 text-xs rounded w-full border-black/30 text-black hover:translate-transition hover:scale-105 hover:bg-red-400 hover:text-black hover:border-black font-medium"
//           >
//             Sair
//           </Button>
//         </div>

//         {/* Navegação mobile */}
//         <div className="md:hidden ml-2">
//           <Sheet>
//             <SheetTrigger asChild>
//               <Button variant="ghost" size="icon">
//                 <Menu />
//               </Button>
//             </SheetTrigger>
//             <SheetContent side="left">
//               <div className="flex flex-col gap-4 mt-8">
//                 {navLinks.map((link) => (
//                   <Link key={link.name} href={link.href} className="text-lg font-bold hover:underline">
//                     {link.name}
//                   </Link>
//                 ))}
//               </div>
//             </SheetContent>
//           </Sheet>
//         </div>
//       </div>
//     </header>
//   );
// }