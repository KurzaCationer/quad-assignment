import {createRootRoute, Link, Outlet} from '@tanstack/react-router'
import {TanStackDevtools} from "@tanstack/react-devtools";
import {ReactQueryDevtoolsPanel} from "@tanstack/react-query-devtools";
import {TanStackRouterDevtoolsPanel} from "@tanstack/react-router-devtools";

const RootLayout = () => {
    return (
        <>
            <div className="p-2 flex gap-2">
                <Link to="/" className="[&.active]:font-bold">
                    Home
                </Link>{' '}
                <Link to="/about" className="[&.active]:font-bold">
                    About
                </Link>
                <Link to="/questions" className="[&.active]:font-bold">
                    Questions
                </Link>
            </div>
            <hr/>
            <Outlet/>
            <TanStackDevtools
                config={{
                    triggerMode: "fixed",
                    position: "bottom-left"
                }}
                plugins={[
                    {
                        name: 'TanStack Query',
                        render: <ReactQueryDevtoolsPanel/>,
                    },
                    {
                        name: 'TanStack Router',
                        render: <TanStackRouterDevtoolsPanel/>,
                    },
                ]}
            />
        </>
    )
}

export const Route = createRootRoute({component: RootLayout})