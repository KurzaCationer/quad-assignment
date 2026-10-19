import {createRootRoute, Outlet} from '@tanstack/react-router'
import {TanStackDevtools} from "@tanstack/react-devtools";
import {ReactQueryDevtoolsPanel} from "@tanstack/react-query-devtools";
import {TanStackRouterDevtoolsPanel} from "@tanstack/react-router-devtools";

const RootLayout = () => {
    return (
        <>
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