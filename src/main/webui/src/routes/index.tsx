import {createFileRoute} from '@tanstack/react-router'
import {useGetApiGetCategories, useGetApiGetQuestions} from "../generated";

export const Route = createFileRoute('/')({
    component: Index,
})

function Index() {
    const categoriesQuery = useGetApiGetCategories({
        query: {
            staleTime: 1000 * 60 * 60 * 2,
        }
    })

    const questionsQuery = useGetApiGetQuestions({}, {
        query: {
            staleTime: Infinity,
        }
    })



    return (
        <div className="p-2">
            <div>Categories isPending: {categoriesQuery.isPending ? "True" : "False"}</div>
            <div>Questions isPending: {questionsQuery.isPending ? "True" : "False"}</div>
            <select onChange={(evt) => {
                console.log(evt.target.value)
            }}>
                {categoriesQuery.data?.data.categories?.map((x) => (<option key={x.id} value={x.id}>{x.name}</option>))}
            </select>
            <div>
                Questions:
                {questionsQuery.data?.data.questions?.map((question) => (
                    <div key={question.id} dangerouslySetInnerHTML={{__html: question.question ?? ""}}>
                    </div>
                ))}
            </div>
            <div>Error: {JSON.stringify(questionsQuery.error, null, 2)}</div>
            <button className={"bg-blue-300 px-2 py-1 rounded-sm"} onClick={async () => await questionsQuery.refetch()}>Refetch
            </button>

            <div>{JSON.stringify(questionsQuery.data, null, 2)}</div>
            <div>{JSON.stringify(categoriesQuery.data, null, 2)}</div>
        </div>
    )
}