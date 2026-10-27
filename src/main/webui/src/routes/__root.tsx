import {createRootRoute, HeadContent, Outlet} from '@tanstack/react-router'
import {TanStackDevtools} from "@tanstack/react-devtools";
import {ReactQueryDevtoolsPanel} from "@tanstack/react-query-devtools";
import {TanStackRouterDevtoolsPanel} from "@tanstack/react-router-devtools";

const RootLayout = () => {
    return (
        <>
            <HeadContent assetCrossOrigin="anonymous" />
            <hr/>
            <Outlet/>
            {import.meta.env.DEV && <TanStackDevtools
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
            />}
        </>
    )
}

export const Route = createRootRoute({
    head: () => ({
        meta: [
            {
                name: 'description',
                content: 'OpenTDB trivia questions',
            },
            {
                title: 'OpenTDB UI',
            },
        ],
    }),
    component: RootLayout
})
