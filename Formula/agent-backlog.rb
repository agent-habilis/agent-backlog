class AgentBacklog < Formula
  desc "kanban board a human and an agent share, as plain files in the repo"
  homepage "https://github.com/agent-habilis/agent-backlog"
  license "MIT"
  version "0.1.0"

  # The release workflow rewrites every version and digest below, matching a
  # `sha256` line only where it directly follows its `url`. Nothing may be put
  # between the two, or that pair keeps its stale digest through the bump and
  # ships a formula that cannot verify.
  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/agent-habilis/agent-backlog/releases/download/v#{version}/agent-backlog-v#{version}-darwin-arm64.tar.gz"
      sha256 "0000000000000000000000000000000000000000000000000000000000000000"
    else
      url "https://github.com/agent-habilis/agent-backlog/releases/download/v#{version}/agent-backlog-v#{version}-darwin-x64.tar.gz"
      sha256 "0000000000000000000000000000000000000000000000000000000000000000"
    end
  end

  on_linux do
    if Hardware::CPU.intel?
      url "https://github.com/agent-habilis/agent-backlog/releases/download/v#{version}/agent-backlog-v#{version}-linux-x64.tar.gz"
      sha256 "0000000000000000000000000000000000000000000000000000000000000000"
    elsif Hardware::CPU.arm?
      url "https://github.com/agent-habilis/agent-backlog/releases/download/v#{version}/agent-backlog-v#{version}-linux-arm64.tar.gz"
      sha256 "0000000000000000000000000000000000000000000000000000000000000000"
    end
  end

  # `--HEAD` builds from source. `bun run install-local` points this at a
  # checkout, so a local install goes through this same formula.
  head do
    url "https://github.com/agent-habilis/agent-backlog.git", branch: "main"
    depends_on "oven-sh/bun/bun" => :build
  end

  def install
    if build.head?
      # Bun's caches default to $HOME, which the build sandbox cannot write.
      ENV["BUN_INSTALL_CACHE_DIR"] = buildpath/"bun-cache"
      ENV["XDG_CACHE_HOME"] = buildpath/"xdg-cache"
      system "bun", "install", "--frozen-lockfile"
      system "bun", "run", "build"
      bin.install "build/agent-backlog"
    else
      # The binary is cross-compiled on Linux, where nothing can sign it, and
      # macOS kills a Bun executable carrying only Bun's own ad-hoc signature.
      # A fresh ad-hoc signature here is accepted.
      system "codesign", "--force", "--sign", "-", "agent-backlog" if OS.mac?
      bin.install "agent-backlog"
    end
  end

  # `plug` cannot run from `install` or `post_install`: both are sandboxed with
  # `deny_read_home` and no write path into `$HOME`, so it could not even detect
  # which harnesses are on the machine. It stays the user's step.
  def caveats
    <<~EOS
      Install the /backlog skill into every harness detected on this machine:
      ! agent-backlog plug
    EOS
  end

  test do
    assert_match "agent-backlog", shell_output("#{bin}/agent-backlog --version")
  end
end
