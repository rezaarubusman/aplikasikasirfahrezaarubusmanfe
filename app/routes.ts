import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),

    layout("components/cashier/cashier.tsx", [
        route("cashierstart", "pages/cashierstart.tsx"),
        route("cashierend", "pages/cashierend.tsx"),
        route("cashierpos", "pages/cashierpos.tsx"),
        route("cashierhistory", "pages/cashierhistory.tsx"),
    ]),

    layout("components/cashier/admin.tsx", [
        route("adminhome", "pages/adminhome.tsx"),
        route("products", "pages/products.tsx"),
        route("category", "pages/category.tsx"),
        route("cashierlist", "pages/cashierlist.tsx"),
        route("reportsales", "pages/reportsales.tsx"),
        route("reportproduct", "pages/reportproduct.tsx"),
        route("reportcashier", "pages/reportcashier.tsx"),
        route("shifttransaction/:shiftId", "pages/shift-transactions.tsx")
    ]),

] satisfies RouteConfig;
