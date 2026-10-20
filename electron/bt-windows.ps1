$ErrorActionPreference = 'SilentlyContinue'
$ProgressPreference = 'SilentlyContinue'
$conn = @{}
$aepOk = $false
try {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime
  $asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
  $null = [Windows.Devices.Enumeration.DeviceInformation, Windows.Devices.Enumeration, ContentType = WindowsRuntime]
  $null = [Windows.Devices.Bluetooth.BluetoothLEDevice, Windows.Devices.Bluetooth, ContentType = WindowsRuntime]
  $aqs = [Windows.Devices.Bluetooth.BluetoothLEDevice]::GetDeviceSelectorFromPairingState($true)
  $props = [System.Collections.Generic.List[string]]@('System.Devices.Aep.IsConnected', 'System.Devices.Aep.DeviceAddress')
  $task = $asTask.MakeGenericMethod([Windows.Devices.Enumeration.DeviceInformationCollection]).Invoke($null, @([Windows.Devices.Enumeration.DeviceInformation]::FindAllAsync($aqs, $props)))
  if ($task.Wait(5000)) {
    $aepOk = $true
    foreach ($d in $task.Result) {
      $p = @{}
      foreach ($kv in $d.Properties) { $p[$kv.Key] = $kv.Value }
      $a = [string]$p['System.Devices.Aep.DeviceAddress']
      if ($a) { $conn[$a.Replace(':', '').ToUpper()] = [bool]$p['System.Devices.Aep.IsConnected'] }
    }
  }
} catch {}
$all = $null
$devices = @(foreach ($d in Get-PnpDevice -Class Bluetooth | Where-Object { $_.InstanceId -like 'BTHLE\DEV_*' -and $_.FriendlyName -match 'NuPhy|Halo ?75' }) {
  $addr = $d.InstanceId.Split('\')[1].Substring(4).ToUpper()
  $battery = $null
  $b = Get-PnpDeviceProperty -InstanceId $d.InstanceId -KeyName '{104EA319-6EE2-4701-BD47-8DDBF425BBE5} 2'
  if ($b -and $b.Type -ne 'Empty' -and $null -ne $b.Data) { $battery = [int]$b.Data }
  if ($null -eq $battery) {
    if ($null -eq $all) { $all = @(Get-PnpDevice) }
    foreach ($node in $all | Where-Object { $_.InstanceId -like "*$addr*" }) {
      $nb = Get-PnpDeviceProperty -InstanceId $node.InstanceId -KeyName '{104EA319-6EE2-4701-BD47-8DDBF425BBE5} 2'
      if ($nb -and $nb.Type -ne 'Empty' -and $null -ne $nb.Data) { $battery = [int]$nb.Data; break }
    }
  }
  [pscustomobject]@{
    name = $d.FriendlyName
    address = $addr
    battery = $battery
    connected = $(if ($conn.ContainsKey($addr)) { $conn[$addr] } else { $null })
  }
})
ConvertTo-Json -Compress -Depth 4 -InputObject ([pscustomobject]@{ aepOk = $aepOk; devices = $devices })
