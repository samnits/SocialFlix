interface Task{
    id: string;
    title: string;
    description: string;
    completed: boolean;
    createdAt: Date;
    updatedAt: Date;
}
interface CreateTaskRequest {
    title: string;
    description: string;
}
let tasks: Task[] = [
    {
        id: "1",
        title: "Sample Task 1",
        description: "This is a sample task description.",
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        id: "2",
        title: "Sample Task 2",
        description: "This is another sample task description.",
        completed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
];

export async function GET() {
    return Response.json(tasks);
}

export async function POST(request: Request) {
    try {
        const body : CreateTaskRequest= await request.json();
        if(!body.title || !body.description) {
            return Response.json({ error: "Title and description are required" }, { status: 400 });
        }
        const newTask: Task = {
            id: crypto.randomUUID(),
            title: body.title,
            description: body.description,
            completed: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        tasks.push(newTask);
        return Response.json(newTask, { status: 201 });
    } catch (error) {
        return Response.json({ error: "Failed to create task" }, { status: 400 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { id } = await request.json();
        tasks = tasks.filter(task => task.id !== id);
        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: "Failed to delete task" }, { status: 400 });
    }
}