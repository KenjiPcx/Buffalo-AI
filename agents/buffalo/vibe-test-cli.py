import argparse
import asyncio
import json
import os
import sys
from typing import List, Optional


# Ensure local imports work when running this file directly
CURRENT_DIR = os.path.dirname(__file__)
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)


from qa_util import scout_page, run_pool  # noqa: E402


def _load_tasks(tasks_str: Optional[str], tasks_file: Optional[str]) -> List[str]:
    if tasks_str and tasks_file:
        raise ValueError("Provide either --tasks or --tasks-file, not both.")

    if tasks_str:
        try:
            parsed = json.loads(tasks_str)
        except json.JSONDecodeError as e:
            raise ValueError(f"--tasks must be a JSON array. Error: {e}") from e
        if not isinstance(parsed, list) or not all(isinstance(x, str) for x in parsed):
            raise ValueError("--tasks must be a JSON array of strings.")
        return parsed

    if tasks_file:
        if not os.path.exists(tasks_file):
            raise FileNotFoundError(f"Tasks file not found: {tasks_file}")
        with open(tasks_file, "r", encoding="utf-8") as f:
            try:
                parsed = json.load(f)
            except json.JSONDecodeError as e:
                raise ValueError(f"Tasks file must contain a JSON array. Error: {e}") from e
        if not isinstance(parsed, list) or not all(isinstance(x, str) for x in parsed):
            raise ValueError("Tasks file must contain a JSON array of strings.")
        return parsed

    raise ValueError("You must provide --tasks or --tasks-file.")


async def _cmd_scout(args: argparse.Namespace) -> None:
    tasks = await scout_page(args.url)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(tasks, f, ensure_ascii=False, indent=2)
    print(json.dumps(tasks, ensure_ascii=False, indent=2))


async def _cmd_run_pool(args: argparse.Namespace) -> None:
    tasks = _load_tasks(args.tasks, args.tasks_file)
    test_id = await run_pool(
        tasks=tasks,
        base_url=args.base_url,
        num_agents=args.num_agents,
        headless=args.headless,
        tag=args.tag,
    )
    print(json.dumps({"test_id": test_id}, ensure_ascii=False, indent=2))


async def _cmd_explore(args: argparse.Namespace) -> None:
    tasks = await scout_page(args.url)
    if args.tasks_out:
        with open(args.tasks_out, "w", encoding="utf-8") as f:
            json.dump(tasks, f, ensure_ascii=False, indent=2)
    test_id = await run_pool(
        tasks=tasks,
        base_url=args.url,
        num_agents=args.num_agents,
        headless=args.headless,
        tag=args.tag,
    )
    print(json.dumps({"test_id": test_id, "tasks": tasks}, ensure_ascii=False, indent=2))


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="CLI for Buffalo QA utilities: scout_page and run_pool",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # scout
    p_scout = subparsers.add_parser("scout", help="Run scout_page to list interactive elements as tasks")
    p_scout.add_argument("--url", required=True, help="Base URL to scout")
    p_scout.add_argument("--out", help="Optional path to write tasks JSON output")
    p_scout.set_defaults(func=_cmd_scout)

    # run-pool
    p_run = subparsers.add_parser("run-pool", help="Run run_pool with provided tasks")
    p_run.add_argument("--base-url", required=True, help="Base URL context for tasks")
    p_run.add_argument("--tasks", help="JSON array of task strings")
    p_run.add_argument("--tasks-file", help="Path to JSON file with array of task strings")
    p_run.add_argument("--num-agents", type=int, default=3, help="Number of agents to run in parallel")
    p_run.add_argument("--headless", action="store_true", help="Run browsers in headless mode")
    p_run.add_argument("--tag", help="Optional tag for this run")
    p_run.set_defaults(func=_cmd_run_pool)

    # explore (scout -> run-pool chain)
    p_explore = subparsers.add_parser(
        "explore",
        help="Scout a URL and immediately run a pool with generated tasks",
    )
    p_explore.add_argument("--url", required=True, help="Base URL to scout and test")
    p_explore.add_argument("--num-agents", type=int, default=3, help="Number of agents to run in parallel")
    p_explore.add_argument("--headless", action="store_true", help="Run browsers in headless mode")
    p_explore.add_argument("--tag", help="Optional tag for this run")
    p_explore.add_argument("--tasks-out", help="Optional path to write generated tasks JSON")
    p_explore.set_defaults(func=_cmd_explore)

    return parser


def main() -> None:
    parser = _build_parser()
    args = parser.parse_args()
    try:
        asyncio.run(args.func(args))
    except Exception as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False, indent=2))
        sys.exit(1)


if __name__ == "__main__":
    main()


