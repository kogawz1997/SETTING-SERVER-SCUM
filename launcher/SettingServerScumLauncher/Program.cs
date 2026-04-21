using System;
using System.Diagnostics;
using System.IO;

internal static class Program
{
    private static int Stop(string message)
    {
        Console.ForegroundColor = ConsoleColor.Red;
        Console.WriteLine(message);
        Console.ResetColor();
        Console.WriteLine("Press Enter to close.");
        Console.ReadLine();
        return 1;
    }

    private static int Main()
    {
        string root = AppDomain.CurrentDomain.BaseDirectory;
        string scriptPath = Path.Combine(root, "Start SETTING SERVER SCUM.ps1");

        if (!File.Exists(scriptPath))
        {
            return Stop("Launcher script was not found: " + scriptPath);
        }

        Console.Title = "SETTING SERVER SCUM";
        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine("SETTING SERVER SCUM - EXE Launcher");
        Console.ResetColor();
        Console.WriteLine("Folder: " + root);
        Console.WriteLine("Starting the local launcher. Keep this window open while using the app.");
        Console.WriteLine();

        ProcessStartInfo startInfo = new ProcessStartInfo();
        startInfo.FileName = "powershell.exe";
        startInfo.WorkingDirectory = root;
        startInfo.UseShellExecute = false;
        startInfo.Arguments = "-NoProfile -ExecutionPolicy Bypass -File \"" + scriptPath + "\"";

        try
        {
            using (Process process = Process.Start(startInfo))
            {
                if (process == null)
                {
                    return Stop("Could not start PowerShell launcher.");
                }
                process.WaitForExit();
                return process.ExitCode;
            }
        }
        catch (Exception ex)
        {
            return Stop("Launcher failed: " + ex.Message);
        }
    }
}
