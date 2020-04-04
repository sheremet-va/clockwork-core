import commands from '../configs/commands';

type Command = {
    name: string;
    projects: string[];
    aliases: string[];
}

export default async function ({ query: { project } }): Promise<{ data: { commands: Command[] } }> {
    const list = commands.filter(cmd => cmd.projects.includes(project));

    return { data: { commands: list } };
}