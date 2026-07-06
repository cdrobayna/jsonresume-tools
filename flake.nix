{
    description = "CV/Resume builder dev shell";

    inputs = {
        nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    };

    outputs = {self, nixpkgs, ... }:
        let
            system = "x86_64-linux";
            pkgs = nixpkgs.legacyPackages.${system};
        in {
            devShells.${system}.default = pkgs.mkShell {
                packages = with pkgs; [
                    nodejs_24
                    pnpm
                ];

                shellHook = ''
                    echo "CV dev shell — node $(node --version), chromium $(chromium --version)"
                '';
            };
        };
}
