import {createFileRoute} from '@tanstack/react-router'
import {getApiGetCategories} from "@/generated/get-categories-endpoint/get-categories-endpoint";
import {getApiGetQuestions} from "@/generated/get-questions-endpoint/get-questions-endpoint";
import {usePostApiCheckAnswers} from "@/generated/check-answers-endpoint/check-answers-endpoint";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {Button, buttonVariants} from "@/components/ui/button.tsx";
import {zodValidator} from '@tanstack/zod-adapter'
import {z} from 'zod'
import {type Dispatch, type Key, type SetStateAction, useEffect, useState} from "react";
import type {VariantProps} from "class-variance-authority";
import QuizScore from "@/components/QuizScore.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";
import {QuestionDifficulty, QuestionType} from "@/generated/api.schemas.ts";

const questionsPageStateSchema = z.object({
    shouldFetch: z.boolean().default(false),
    category: z.number().default(-1),
    difficulty: z.nativeEnum(QuestionDifficulty).default("EASY"),
    type: z.nativeEnum(QuestionType).default("MULTIPLE")
})

type QuestionPageStateType = z.infer<typeof questionsPageStateSchema>

export const Route = createFileRoute('/')({
    component: Index,
    validateSearch: zodValidator(questionsPageStateSchema),
    staleTime: Infinity,
    loaderDeps: ({search}) => ({...search}),
    loader: async (ctx) => ({
        categories: await getApiGetCategories().then(x => x.data.categories),
        questions: ctx.deps.shouldFetch ? await getApiGetQuestions({
            categoryId: ctx.deps.category,
            difficulty: ctx.deps.difficulty,
            type: ctx.deps.type,
            amount: 7
        }).then(x => x.data.questions) : [],
        fetchedAt: Date.now(),
    })
})

function Index() {
    const {categories, questions, fetchedAt: fetchedAtLoader} = Route.useLoaderData();
    const {category, shouldFetch, difficulty, type} = Route.useSearch();
    const navigate = Route.useNavigate();

    const [fetchedAt, setFetchedAt] = useState(fetchedAtLoader)
    const [shouldFetchDisplay, setShouldFetchDisplay] = useState(shouldFetch);
    const [categoryDisplay, setCategoryDisplay] = useState(category);
    const [difficultyDisplay, setDifficultyDisplay] = useState(difficulty)
    const [typeDisplay, setTypeDisplay] = useState(type);

    const [givenAnswers, setGivenAnswers] = useState<{ [id: string]: string }>({});
    const [correctAnswers, setCorrectAnswers] = useState<{ [id: string]: string }>({});

    const answerEntries = Object.entries(givenAnswers);
    const correctAnswerEntries = Object.entries(correctAnswers);

    const totals = {
        questions: questions?.length ?? 0,
        answeredQuestions: Object.keys(correctAnswers).length,
        correctlyAnsweredQuestions: correctAnswerEntries.filter(ca => answerEntries.some(a => {
            return ca[0] === a[0] && ca[1] === a[1];
        })).length
    };

    const score = totals.answeredQuestions > 0 ? {
        percentageCorrectlyAnswered: totals.correctlyAnsweredQuestions / totals.answeredQuestions * 100
    } : null;

    const categorySelectItems = [{
        label: "No category",
        value: -1
    }, ...categories?.map(item => {
        return {label: item.name, value: item.id}
    }) ?? []];

    const checkAnswersMutation = usePostApiCheckAnswers({});

    const resetState = () => {
        setGivenAnswers({});
        setCorrectAnswers({});
    };

    const setSearchParameter = async <K extends keyof QuestionPageStateType>(
        key: K,
        valueOrAction: SetStateAction<QuestionPageStateType[K]>
    ) => {
        resetState();

        const setters: {
            [P in keyof QuestionPageStateType]: Dispatch<SetStateAction<QuestionPageStateType[P]>>
        } = {
            shouldFetch: setShouldFetchDisplay,
            category: setCategoryDisplay,
            difficulty: setDifficultyDisplay,
            type: setTypeDisplay,
        };

        setters[key](valueOrAction);
        await navigate({
            search: (prev) => ({
                ...prev,
                [key]: typeof valueOrAction === "function" ? valueOrAction(prev[key]) : valueOrAction
            })
        });
    };

    const toggleShouldFetch = async () => {
        await setSearchParameter("shouldFetch", prev => !prev);
    }

    //Reset state when route loader updates the questions
    useEffect(() => {
        if (fetchedAt !== fetchedAtLoader) {
            resetState();
            setFetchedAt(fetchedAtLoader)
        }
    }, [fetchedAt, fetchedAtLoader]);

    const submit = async () => {
        const response = await checkAnswersMutation.mutateAsync({data: {question_ids: Object.keys(givenAnswers)}});

        let newAnswers = {};
        newAnswers = response?.data!.answers?.filter(a => a.id !== undefined).reduce((prev, current) => ({
            ...prev,
            [current.id!]: current.correct_answer
        }), newAnswers) ?? {};
        setCorrectAnswers(newAnswers);
    };

    const anySearchParameterChanging = (category !== categoryDisplay) || (shouldFetch !== shouldFetchDisplay) ||
        (difficultyDisplay !== difficulty) || (typeDisplay !== type);

    return (
        <div className="max-w-300 mx-auto px-4 py-4 sm:px-6">
            <div className={"flex flex-wrap gap-2 items-center"}>
                <h1 className={"font-heading text-3xl font-semibold"}>Questions</h1>
                <div className={"flex w-full min-w-0 flex-wrap gap-2 items-center sm:w-auto"}>
                    <Button className={"px-6 py-4 w-20"} onClick={toggleShouldFetch}>
                        {shouldFetchDisplay ? "Stop" : "Start"}
                    </Button>
                    <CustomSelect
                        value={categoryDisplay}
                        onValueChange={(value) => setSearchParameter("category", prev => value ?? prev)}
                        items={categorySelectItems}
                        label={"Categories"}
                    />
                    <CustomSelect
                        value={difficultyDisplay}
                        onValueChange={(value) => setSearchParameter("difficulty", prev => value ?? prev)}
                        items={Object.values(QuestionDifficulty).map(v => (
                            {
                                label: v.charAt(0).toUpperCase() + v.slice(1).toLowerCase(),
                                value: v
                            }
                        ))}
                        label={"Difficulty"}
                    />
                    <CustomSelect
                        value={typeDisplay}
                        onValueChange={(value) => setSearchParameter("type", prev => value ?? prev)}
                        items={Object.values(QuestionType).map(v => ({
                            label: v === "MULTIPLE" ? "Multiple choice" : "True/False",
                            value: v
                        }))}
                        label={"Type"}
                    />
                    {anySearchParameterChanging && <Spinner className="shrink-0"/>}
                </div>
            </div>
            <div className={"flex flex-col mt-4 gap-3"}>
                {questions?.map(q => {
                    let possible_answers = q.possible_answers ?? [];
                    if (q.possible_answers?.every(a => a === "True" || a === "False")) {
                        possible_answers = ["True", "False"]
                    }

                    return (
                        <div className={"flex flex-col gap-2"} key={q.id}>
                            <div dangerouslySetInnerHTML={{__html: q.question ?? ""}}
                                 className={"bg-primary/10 p-2 rounded-sm wrap-anywhere"}/>
                            <div className={"flex flex-wrap gap-2"}>
                                {possible_answers.map((answer, index) => {
                                    const givenAnswer = givenAnswers[q.id!] === answer;
                                    const correctAnswer = correctAnswers[q.id!] === answer;

                                    let variantProps: VariantProps<typeof buttonVariants> = {
                                        variant: correctAnswer ? "confirmative" : givenAnswer ? "default" : "outline",
                                        size: "lg"
                                    }
                                    return (
                                        <Button key={index} {...variantProps}
                                                onClick={() => {
                                                    setGivenAnswers((oldAnswers) => ({
                                                        ...oldAnswers,
                                                        [q.id!]: answer
                                                    }));
                                                }}
                                                disabled={correctAnswers[q.id!] !== undefined}
                                                className={"h-auto min-h-8 max-w-full whitespace-normal wrap-anywhere py-4 text-center"}
                                                dangerouslySetInnerHTML={{__html: answer ?? ""}}/>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
            {(questions?.length ?? 0) > 0 &&
                <Button
                    disabled={checkAnswersMutation.isPending || correctAnswerEntries.length >= (questions?.length ?? 10)}
                    className={"px-6 py-4 w-20 mt-4"}
                    onClick={submit}>
                    {(checkAnswersMutation.isPending) ? (
                        <Spinner className="animate-spin"/>
                    ) : "Submit"}
                </Button>
            }

            {score !== null && (
                <QuizScore score={score} totals={totals}/>
            )}
        </div>
    )
}

interface CustomSelectProps<T extends Key> {
    value: T;
    onValueChange: (value: T | null) => void;
    items: { label: string, value: T }[];
    label?: string;
}

function CustomSelect<T extends Key>({value, onValueChange, items, label}: CustomSelectProps<T>) {
    return (
        <Select value={value} onValueChange={onValueChange}
                items={items}>
            <SelectTrigger className={"min-w-0 flex-1 h-8 sm:w-65 sm:flex-none"}>
                <SelectValue className="min-w-0 truncate"/>
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    {label && <SelectLabel>{label}</SelectLabel>}
                    {items.map(item =>
                        (
                            <SelectItem key={item.value} value={item.value}
                                        className="*:min-w-0 *:shrink *:whitespace-normal *:wrap-anywhere">
                                {item.label}
                            </SelectItem>
                        ))
                    }
                </SelectGroup>
            </SelectContent>
        </Select>
    )
}
