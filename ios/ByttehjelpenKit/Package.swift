// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "ByttehjelpenKit",
    defaultLocalization: "nb",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(name: "ByttehjelpenKit", targets: ["ByttehjelpenKit"])
    ],
    targets: [
        .target(
            name: "ByttehjelpenKit",
            path: "Sources/ByttehjelpenKit",
            swiftSettings: [
                .enableExperimentalFeature("StrictConcurrency"),
                .enableUpcomingFeature("ExistentialAny")
            ]
        ),
        .testTarget(
            name: "ByttehjelpenKitTests",
            dependencies: ["ByttehjelpenKit"],
            path: "Tests/ByttehjelpenKitTests"
        )
    ]
)
