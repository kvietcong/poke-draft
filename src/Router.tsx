import {
    createBrowserRouter,
    createRoutesFromElements,
    Navigate,
    Route,
    RouterProvider,
} from "react-router-dom";
import { Layout } from "./layouts/Layout";
import { ProfilePage } from "./components/Auth/Auth";
import { HomePage } from "./components/Home/Home";
import { RulesetListPage } from "./components/Ruleset/RulesetList";
import { RulesetPage } from "./components/Ruleset/Ruleset";
import { NotFound } from "./components/NotFound/NotFound";
import { GameListPage } from "./components/Game/GameList";
import { EditGamePage } from "./components/Game/EditGame";
import { GamePage } from "./components/Game/Game";

const router = createBrowserRouter(
    createRoutesFromElements(
        <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="/ruleset">
                <Route index element={<RulesetListPage />} />
                <Route path=":id" element={<RulesetPage />} />
            </Route>
            <Route path="/game">
                <Route index element={<GameListPage />} />
                <Route path=":id">
                    <Route index element={<Navigate to="./info" />} />
                    <Route path=":tab" element={<GamePage />} />
                    <Route path="edit/" element={<EditGamePage />} />
                </Route>
            </Route>
            <Route path="/account" element={<ProfilePage />} />
            <Route path="*" element={<NotFound />} />
        </Route>
    )
);

export function Router() {
    return <RouterProvider router={router} />;
}
