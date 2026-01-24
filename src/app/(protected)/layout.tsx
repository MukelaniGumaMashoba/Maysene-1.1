"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Briefcase,
  Building2,
  Car,
  ChartBar,
  DollarSign,
  Phone,
  PlusSquare,
  QrCode,
  Settings,
  Settings2Icon,
  Truck,
  Users,
  Wrench,
  Route,
  Construction,
  StepForward,
} from "lucide-react";
import GlobalProvider from "@/context/global-context/provider";

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

// Role-based navigation configuration
const roleNavigation = {
  "fleet manager": [
    { name: "Dashboard", href: "/dashboard", Icon: <ChartBar /> },    
    { name: "Load Plan", href: "/load-plan", Icon: <Route /> },
    { name: "Statistics", href: "/statistics", Icon: <StepForward /> },
    { name: "Jobs", href: "/jobsFleet", Icon: <Briefcase /> },
    {
      name: "Inspections",
      href: "/fleetManager/inspections",
      Icon: <QrCode />,
    },  
    { name: "Stop Points", href: "/fleetManager/stop-points", Icon: <Route /> },
    { name: "Drivers", href: "/drivers", Icon: <Users /> },
    { name: "Vehicles", href: "/vehicles", Icon: <Car /> },
    { name: "Clients", href: "/fleetManager/clients", Icon: <Building2 /> },
    { name: "Financials", href: "/audit", Icon: <Settings2Icon /> },
    { name: "Fuel Can Bus", href: "/fuel", Icon: <Truck /> },
    { name: "User Management", href: "/userManagement", Icon: <PlusSquare /> }, 
    { name: "System Settings", href: "/settings", Icon: <Settings /> },
  ],
  fc: [
    { name: "Dashboard", href: "/dashboard", Icon: <ChartBar /> },
    { name: "Fleet Manager", href: "/fleetManager", Icon: <Truck /> },
    {
      name: "Inspections",
      href: "/fleetManager/inspections",
      Icon: <Briefcase />,
    },
    { name: "Jobs", href: "/jobsFleet", Icon: <Briefcase /> },
    { name: "Drivers", href: "/drivers", Icon: <Users /> },
    { name: "Vehicles", href: "/vehicles", Icon: <Car /> },
    { name: "Qoute Management", href: "/qoutation", Icon: <Building2 /> },
    // { name: 'Profile', href: '/profile', Icon: <Settings2Icon /> },
    { name: "System Settings", href: "/settings", Icon: <Settings /> },
    { name: "User Management", href: "/userManagement", Icon: <PlusSquare /> },
  ],
  "call centre": [
    { name: "Dashboard", href: "/dashboard", Icon: <ChartBar /> },
    { name: "Jobs", href: "/jobs", Icon: <Briefcase /> },
    { name: "Call Center", href: "/callcenter", Icon: <Phone /> },
    {
      name: "Technicians Assignment",
      href: "/callcenter/technician",
      Icon: <Wrench />,
    },
    {
      name: "Technician Vehicles",
      href: "/callcenter/breakdowns",
      Icon: <Truck />,
    },
    { name: "Workshops", href: "/callcenter/clients", Icon: <Users /> },
    { name: "Qoute Management", href: "/ccenter", Icon: <Building2 /> },
    // { name: 'Profile', href: '/profile', Icon: <Settings2Icon /> },
    { name: "System Settings", href: "/settings", Icon: <Settings /> },
  ],
  customer: [
    { name: "Dashboard", href: "/dashboard", Icon: <ChartBar /> },
    { name: "Technicians Assignment", href: "/extechnicians", Icon: <Users /> },
    { name: "Workshop Vehicles", href: "/exvehicles", Icon: <Car /> },
    { name: "Qoute Management", href: "/workshopQoute", Icon: <Building2 /> },
    // { name: 'User Management', href: '/userManagement', Icon: <PlusSquare /> },
    // { name: 'Profile', href: '/profile', Icon: <Settings2Icon /> },
    { name: "System Settings", href: "/settings", Icon: <Settings /> },
  ],
  "cost centre": [
    { name: "Dashboard", href: "/dashboard", Icon: <ChartBar /> },
    { name: "Cost", href: "/ccenter", Icon: <Building2 /> },
    {
      name: "Qoute Management",
      href: "/ccenter/create-qoutation",
      Icon: <DollarSign />,
    },
    // { name: 'Profile', href: '/profile', Icon: <Settings2Icon /> },
    { name: "System Settings", href: "/settings", Icon: <Settings /> },
  ],
};

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [navigation, setNavigation] = useState<any[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    // Get user role from cookies
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(";").shift();
      return null;
    };

    const role = decodeURIComponent(getCookie("role") || "");
    const session = getCookie("session");

    console.log("Layout - Session cookie:", session ? "exists" : "missing");
    console.log("Layout - Role cookie:", role || "missing");

    if (role) {
      setUserRole(role);
      // Set navigation based on role
      const roleNav = roleNavigation[role as keyof typeof roleNavigation] || [];

      // Force fleet manager to only have 2 items
      if (role === "customer") {
        const customerManagerNav = [
          { name: "Dashboard", href: "/dashboard", Icon: <ChartBar /> },
          { name: "Load Plan", href: "/load-plan", Icon: <Route /> },
        ];
        setNavigation(customerManagerNav);
        console.log(
          "Layout - Fleet Manager restricted to 2 items:",
          customerManagerNav.length
        );
      } else if (role === "customer") {
        const customerNav = [
          { name: "Drivers", href: "/drivers", Icon: <Users /> },
          { name: "Vehicles", href: "/vehicles", Icon: <Car /> },
          {
            name: "Inspections",
            href: "/fleetManager/inspections",
            Icon: <QrCode />,
          },
          { name: "Fuel Can Bus", href: "/fuel", Icon: <Truck /> },
        ];
        setNavigation(customerNav);
        console.log(
          "Layout - Customer restricted to 4 items:",
          customerNav.length
        );
      } else {
        setNavigation(roleNav);
      }

      console.log(
        "Layout - Navigation set for role:",
        role,
        "Items:",
        navigation.length || roleNav.length
      );
    } else {
      console.log("Layout - No role found, redirecting to login");
      window.location.href = "/login";
    }
  }, []);

  const handleLogout = () => {
    window.location.href = "/logout";
  };
  return (
    // <div className="bg-gray-50 w-full">
    //   {/* Mobile sidebar overlay */}
    //   {sidebarOpen && (
    //     <div
    //       className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden w-full"
    //       onClick={() => setSidebarOpen(false)}
    //     />
    //   )}

    //   {/* Sidebar: this is sticky/fixed and does NOT move */}
    //   <div
    //     className={`
    //     fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-slate-900 to-slate-800 shadow-2xl
    //     transform transition-transform duration-300 ease-in-out
    //     ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
    //     lg:translate-x-0
    //     h-screen border-r border-slate-700
    //   `}
    //   >
    //     {/* Header, nav, footer go here */}
    //     <div className="flex flex-col h-full">
    //       {/* Header */}
    //       <div className="flex items-center justify-between p-6 border-b border-slate-700">
    //         <div className="flex items-center space-x-3">
    //           <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
    //             <span className="text-white font-bold text-sm">BL</span>
    //           </div>
    //           <h1 className="text-lg font-bold text-white">
    //             Maysene Logistics
    //           </h1>
    //         </div>
    //         <Button
    //           variant="ghost"
    //           size="sm"
    //           onClick={() => setSidebarOpen(false)}
    //           className="lg:hidden text-gray-400 hover:text-white hover:bg-slate-700"
    //         >
    //           ✕
    //         </Button>
    //       </div>

    //       {/* Navigation */}
    //       <nav className="flex-1 p-4 space-y-1">
    //         {navigation.map((item) => {
    //           const isActive = pathname === item.href;

    //           return (
    //             <Link
    //               key={item.name}
    //               href={item.href}
    //               className={`
    //                 flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200
    //                 ${
    //                   isActive
    //                     ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-105"
    //                     : "text-gray-300 hover:bg-slate-700 hover:text-white hover:transform hover:scale-105"
    //                 }
    //               `}
    //               onClick={() => setSidebarOpen(false)}
    //             >
    //               <span className="mr-3 text-lg">{item.Icon}</span>
    //               {item.name}
    //             </Link>
    //           );
    //         })}
    //       </nav>

    //       {/* Footer */}
    //       <div className="p-4 border-t border-slate-700">
    //         <div className="mb-3 p-3 bg-slate-800 rounded-lg">
    //           <div className="text-xs text-gray-400 mb-1">Current Role</div>
    //           <div className="text-sm font-medium text-white capitalize">
    //             {userRole
    //               ? userRole === "customer"
    //                 ? "workshop"
    //                 : userRole
    //               : "No User"}
    //           </div>
    //         </div>
    //         <Button
    //           onClick={handleLogout}
    //           variant="outline"
    //           className="w-full bg-transparent border-slate-600 text-gray-300 hover:bg-slate-700 hover:text-white hover:border-slate-500"
    //         >
    //           🚪 Logout
    //         </Button>
    //       </div>
    //     </div>
    //   </div>

    //   {/* Main content: this scrolls */}
    //   <div className="ml-64 h-screen overflow-y-auto bg-gray-50">
    //     {/* Top bar */}
    //     <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
    //       <div className="flex items-center justify-between px-6 py-4">
    //         <Button
    //           variant="ghost"
    //           size="sm"
    //           onClick={() => setSidebarOpen(true)}
    //           className="lg:hidden hover:bg-gray-100"
    //         >
    //           ☰
    //         </Button>

    //         <div className="flex items-center space-x-6">
    //           <div className="flex items-center space-x-3">
    //             <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
    //               <span className="text-white font-medium text-sm">U</span>
    //             </div>
    //             <div>
    //               <span className="text-sm font-medium text-gray-900">
    //                 Welcome back
    //               </span>
    //               <div className="text-xs text-gray-500 capitalize">
    //                 {userRole === "customer" ? "workshop" : userRole || "User"}
    //               </div>
    //             </div>
    //           </div>
    //         </div>
    //       </div>
    //     </div>

    //     {/* Page content */}
    //     <main className="p-6 w-full">
    //       <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
    //         <GlobalProvider>{children}</GlobalProvider>
    //       </div>
    //     </main>
    //   </div>
    // </div>
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-white shadow-xl transform transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 z-50`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b flex items-center justify-center">
            <h1 className="text-2xl font-bold text-blue-600">
              Maysene Logistics
            </h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-400 hover:text-gray-600"
            >
              ✕
            </Button>
          </div>
          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-transform duration-200 ${
                  pathname === item.href
                    ? "bg-blue-600 text-white shadow-lg scale-105"
                    : "text-gray-700 hover:bg-gray-100 hover:scale-105"
                }`}
              >
                <span className="mr-3">{item.Icon}</span>
                {item.name}
              </Link>
            ))}
          </nav>
          {/* Footer */}
          <div className="p-4 border-t text-center text-xs text-gray-500">
            <p className="m-3">{userRole === "customer" ? "workshop" : userRole || "User"}</p>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full bg-transparent border-slate-600 text-gray-300 hover:bg-slate-700 hover:text-white hover:border-slate-500"
            >
              🚪 Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 overflow-y-auto">
        {/* Hero Section */}
        <section
          className="relative h-64 md:h-80 lg:h-96 bg-cover bg-center"
          style={{ backgroundImage: "url('/maysene.jpg')" }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent"></div>
          <div className="absolute inset-0 flex items-center justify-center text-center text-white">
            <h1 className="text-3xl md:text-5xl font-bold animate-fadeIn">
              We deliver - Kae Kapa Kae
            </h1>
          </div>
        </section>

        {/* Top Bar */}
        <header className="sticky top-0 bg-white shadow-sm p-4 flex justify-between items-center z-40">
          <Button onClick={() => setSidebarOpen(true)} className="lg:hidden">
            ☰
          </Button>
          <span className="text-gray-700 font-medium">Welcome back</span>
        </header>

        {/* Page Content */}
        <main className="p-6 w-full">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <GlobalProvider>{children}</GlobalProvider>
          </div>
        </main>
      </div>
    </div>
  );
}
