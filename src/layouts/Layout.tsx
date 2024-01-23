import { Footer } from "@/components/Footer/Footer";
import { Header } from "@/components/Header/Header";
import { Outlet } from "react-router-dom";
import classes from "./Layout.module.css";

export const Layout = () => {
    return (
        <main className={classes.main}>
            <section className={classes.section}>
                <Header />
                <Outlet />
            </section>
            <Footer />
        </main>
    );
};
