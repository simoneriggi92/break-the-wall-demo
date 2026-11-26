#!/usr/bin/env bash
# Starts and stops a take: claude in a tmux session, shown in a browser through ttyd, and the recorder.
#
#   tools/media/take.sh start <name> [claude command...]   default command: claude
#   tools/media/take.sh keys <name> <text>                 types text into claude, then Enter
#   tools/media/take.sh key <name> <tmux key>...           sends keys as they are (Escape, Down, C-c…)
#   tools/media/take.sh screen <name>                      prints what the terminal shows
#   tools/media/take.sh stop <name>                        composes takes/<name>/take.mp4, ends it all
#
# Set CLAUDE_CONFIG_DIR to run claude in a clean profile. The take's files land in takes/<name>/.
# Break the Wall keeps its history per computer user, not per Claude profile: each take gets its own,
# empty, in takes/<name>/btw-data, so no earlier session shows in the page. BTW_USER_DATA_DIR overrides it.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
repo="$(cd "$here/../.." && pwd)"
action="${1:?usage: take.sh start|keys|key|screen|stop <name> ...}"
name="${2:?a take needs a name}"
shift 2
take="$repo/takes/$name"
# A tmux server of its own, so a take never touches the person's tmux sessions.
tmux_() { tmux -L btw-take "$@"; }
port="${TTYD_PORT:-7681}"

case "$action" in
  start)
    if tmux_ has-session -t take 2>/dev/null; then
      echo "A take is already running: stop it first." >&2
      exit 1
    fi
    mkdir -p "$take"
    export BTW_USER_DATA_DIR="${BTW_USER_DATA_DIR:-$take/btw-data}"
    command=("$@")
    [ ${#command[@]} -gt 0 ] || command=(claude)
    # claude refuses to start inside another Claude Code session, and the variables that say so
    # are inherited from whoever runs this script: drop them all, except the profile's folder.
    unset_vars=()
    while IFS= read -r var; do
      [ "$var" = CLAUDE_CONFIG_DIR ] || unset_vars+=(-u "$var")
    done < <(env | sed -n 's/^\(CLAUDE[A-Z0-9_]*\)=.*/\1/p')
    tmux_ new-session -d -s take -x 140 -y 40 -c "$repo" env ${unset_vars[@]+"${unset_vars[@]}"} "${command[@]}"
    tmux_ set-option -t take status off
    # Claude Code asks for focus events, and prints a hint into the take when tmux withholds them.
    tmux_ set-option -g focus-events on
    # The DOM renderer: xterm's GPU renderers draw at the wrong pixel ratio in a recorded window.
    ttyd --port "$port" --interface lo0 -t fontSize=16 -t fontFamily=Menlo -t rendererType=dom \
      tmux -L btw-take attach -t take >"$take/ttyd.log" 2>&1 &
    echo $! >"$take/ttyd.pid"
    rm -f "$take/control.json"
    node "$here/record.mjs" "$take" --terminal "http://localhost:$port" >"$take/record.log" 2>&1 &
    echo $! >"$take/record.pid"
    for _ in $(seq 1 60); do
      [ -f "$take/control.json" ] && break
      sleep 0.5
    done
    [ -f "$take/control.json" ] || { echo "The recorder did not start: see $take/record.log" >&2; exit 1; }
    echo "Recording takes/$name. Drive the page with: node tools/media/drive.mjs takes/$name <command>"
    ;;
  keys)
    tmux_ send-keys -t take -l "${1:?text to type}"
    sleep 0.3
    tmux_ send-keys -t take Enter
    ;;
  key)
    tmux_ send-keys -t take "$@"
    ;;
  screen)
    tmux_ capture-pane -t take -p
    ;;
  stop)
    node "$here/drive.mjs" "$take" stop || echo "The recorder did not answer: see $take/record.log" >&2
    [ -f "$take/ttyd.pid" ] && kill "$(cat "$take/ttyd.pid")" 2>/dev/null || true
    tmux_ kill-server 2>/dev/null || true
    rm -f "$take/ttyd.pid" "$take/record.pid" "$take/control.json"
    ;;
  *)
    echo "Unknown action: $action" >&2
    exit 2
    ;;
esac
