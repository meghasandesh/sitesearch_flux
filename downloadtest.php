<?php
	var_dump($_REQUEST);
	
	echo "{";
	
	foreach ($vars as $var) {
		
		$filepath = "testfiles/".$var;
		
		
		if(file_exists($filepath)) {
			echo "\"".$var."\"".":"."\"".$filepath."\"";
		}
		else "\"".$var."\"".":"."\""."false"."\"";
		
		if($var != end($vars)) {
			echo ",";
		}
	}
	echo '}';
?>
